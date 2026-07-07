/**
 * useVoiceOrder — Browser Web Speech API hook for voice-based POS ordering
 *
 * Supports commands like:
 *  "Add 2 chicken biryani"
 *  "One masala dosa and 3 mango lassi"
 *  "Remove biryani"
 *  "Clear cart"
 *  "Place order"
 *  "Cancel"
 *
 * No external API key needed — uses browser's built-in SpeechRecognition.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// ── Number word → digit map ──────────────────────────────────────────────────
const WORD_TO_NUM = {
  one:1, two:2, three:3, four:4, five:5,
  six:6, seven:7, eight:8, nine:9, ten:10,
  a:1, an:1, one:1,
};

const parseQty = (word) => {
  if (!word) return 1;
  const n = parseInt(word, 10);
  if (!isNaN(n)) return Math.max(1, n);
  return WORD_TO_NUM[word.toLowerCase()] || 1;
};

// ── Fuzzy match menu item by voice text ──────────────────────────────────────
const findMenuItem = (text, menuItems) => {
  const t = text.toLowerCase().trim();
  // Exact name match first
  let found = menuItems.find(m => m.name.toLowerCase() === t);
  if (found) return found;
  // Partial match — item name appears somewhere in the spoken text
  found = menuItems.find(m => t.includes(m.name.toLowerCase()));
  if (found) return found;
  // Partial match — spoken word appears in item name
  const words = t.split(/\s+/);
  for (const word of words) {
    if (word.length < 3) continue;
    found = menuItems.find(m => m.name.toLowerCase().includes(word));
    if (found) return found;
  }
  return null;
};

// ── Parse transcript into cart actions ──────────────────────────────────────
export const parseVoiceCommand = (transcript, menuItems) => {
  const text    = transcript.toLowerCase().trim();
  const actions = [];

  // ── Global commands ───────────────────────────────────────────
  if (/\b(clear|empty|reset|cancel all)\b/.test(text)) {
    return [{ type: 'CLEAR_CART' }];
  }
  if (/\b(place order|confirm order|send to kitchen|checkout)\b/.test(text)) {
    return [{ type: 'PLACE_ORDER' }];
  }
  if (/\b(cancel|stop|nevermind)\b/.test(text)) {
    return [{ type: 'CANCEL' }];
  }

  // ── Remove item ───────────────────────────────────────────────
  const removeMatch = text.match(/\b(remove|delete|take out|cancel)\s+(.+)/);
  if (removeMatch) {
    const item = findMenuItem(removeMatch[2], menuItems);
    if (item) return [{ type: 'REMOVE_ITEM', item }];
  }

  // ── Add items ─────────────────────────────────────────────────
  // Split on "and", "&", comma, "also"
  const segments = text
    .replace(/\b(add|order|give me|i want|get me|bring)\b/gi, '')
    .split(/\band\b|,|&|\balso\b|\bplus\b/);

  for (const seg of segments) {
    const clean = seg.trim();
    if (!clean) continue;

    // Pattern: (qty?) (item name)
    // e.g. "2 chicken biryani", "one masala dosa", "biryani"
    const qtyMatch = clean.match(/^(\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s+(.+)$/i);
    if (qtyMatch) {
      const qty  = parseQty(qtyMatch[1]);
      const item = findMenuItem(qtyMatch[2].trim(), menuItems);
      if (item) actions.push({ type: 'ADD_ITEM', item, qty });
    } else {
      // No qty prefix — assume qty 1
      const item = findMenuItem(clean, menuItems);
      if (item) actions.push({ type: 'ADD_ITEM', item, qty: 1 });
    }
  }

  return actions;
};

// ── Hook ─────────────────────────────────────────────────────────────────────
export const useVoiceOrder = ({ menuItems, onAddItem, onRemoveItem, onClearCart, onPlaceOrder }) => {
  const [isListening,  setIsListening]  = useState(false);
  const [transcript,   setTranscript]   = useState('');
  const [statusMsg,    setStatusMsg]    = useState('');
  const [lastActions,  setLastActions]  = useState([]);
  const [supported,    setSupported]    = useState(true);

  const recognitionRef = useRef(null);

  // ── Browser support check ─────────────────────────────────────
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous    = false;
    recognition.interimResults = true;
    recognition.lang          = 'en-IN'; // Indian English — handles accents better

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
      setStatusMsg('🎤 Listening...');
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final   = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) final += result[0].transcript;
        else interim += result[0].transcript;
      }
      setTranscript(final || interim);
      if (final) setStatusMsg(`Heard: "${final}"`);
    };

    recognition.onerror = (event) => {
      const msgs = {
        'no-speech':         '🔇 No speech detected. Try again.',
        'audio-capture':     '🎙️ No microphone found.',
        'not-allowed':       '🚫 Microphone permission denied.',
        'network':           '🌐 Network error.',
        'aborted':           '',
      };
      setStatusMsg(msgs[event.error] || `Error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = (event) => {
      setIsListening(false);
      // Process the final transcript
      const finalText = recognitionRef.current?._lastTranscript;
      if (finalText) {
        const actions = parseVoiceCommand(finalText, menuItems);
        setLastActions(actions);
        processActions(actions, finalText);
      }
    };

    recognitionRef.current = recognition;
  }, [menuItems]); // eslint-disable-line

  // Store transcript for onend handler
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current._lastTranscript = transcript;
    }
  }, [transcript]);

  // ── Process parsed actions ────────────────────────────────────
  const processActions = useCallback((actions, rawText) => {
    if (!actions || actions.length === 0) {
      setStatusMsg(`❓ Didn't understand "${rawText}". Try "2 biryani and 1 lassi"`);
      return;
    }

    const added   = [];
    const removed = [];

    for (const action of actions) {
      switch (action.type) {
        case 'ADD_ITEM':
          onAddItem(action.item, action.qty);
          added.push(`${action.qty}x ${action.item.name}`);
          break;
        case 'REMOVE_ITEM':
          onRemoveItem(action.item);
          removed.push(action.item.name);
          break;
        case 'CLEAR_CART':
          onClearCart();
          setStatusMsg('🗑️ Cart cleared!');
          return;
        case 'PLACE_ORDER':
          onPlaceOrder();
          setStatusMsg('🚀 Placing order...');
          return;
        case 'CANCEL':
          setStatusMsg('👍 Cancelled.');
          return;
        default:
          break;
      }
    }

    const msgs = [];
    if (added.length)   msgs.push(`✅ Added: ${added.join(', ')}`);
    if (removed.length) msgs.push(`🗑️ Removed: ${removed.join(', ')}`);
    if (msgs.length) setStatusMsg(msgs.join(' · '));
    else setStatusMsg(`❓ No matching items found for "${rawText}"`);
  }, [onAddItem, onRemoveItem, onClearCart, onPlaceOrder]);

  // ── Public controls ───────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!supported) {
      setStatusMsg('❌ Voice not supported in this browser. Use Chrome/Edge.');
      return;
    }
    if (isListening) return;
    try {
      recognitionRef.current?.start();
    } catch (e) {
      setStatusMsg('Mic already active. Wait a moment.');
    }
  }, [supported, isListening]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return {
    isListening,
    transcript,
    statusMsg,
    lastActions,
    supported,
    startListening,
    stopListening,
  };
};
