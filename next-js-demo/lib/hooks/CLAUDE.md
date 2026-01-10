<system_context>
Custom React hooks for stock management workflows. Encapsulates session management, scan handling, and validation logic to support modular component architecture.
</system_context>

<file_map>
## FILE MAP
- `useStockOutSession.ts` - Session state management hook (session ID, scanned items, logging, aggregation)
- `useScanHandler.ts` - QR scan handling hook (validation, audio feedback, duplicate prevention)
</file_map>

<patterns>
## PATTERNS

**Session Management Hook Pattern**
`useStockOutSession` centralizes all session-related state:
- Generates UUID session ID on mount
- Maintains scannedItems state + ref for validation
- Auto-computes aggregatedItems from scannedItems
- Provides logging functions (addLog, downloadLogs)
- Exposes session lifecycle functions (clearSession, resetSession)
Example: `useStockOutSession.ts:27-130`

**Scan Handler Hook Pattern**
`useScanHandler` encapsulates QR scan logic:
- Accepts orchestrator state (selectedOrder, scannedItemsRef) + callbacks
- Handles QR parsing, validation, and state updates
- Plays audio feedback (800Hz success, 400Hz error)
- Prevents duplicate scans via isProcessingScanRef
- Returns handlers + debug data for components
Example: `useScanHandler.ts:31-173`

**Ref-Based State Tracking**
Both hooks use refs to prevent race conditions:
- `scannedItemsRef` - Synchronous access to current items (avoids stale closures in validation)
- `isProcessingScanRef` - Blocks duplicate scan callbacks immediately
- `logsRef` - Captures logs for download without triggering re-renders
- useEffect keeps refs synced with state changes
Example: `useStockOutSession.ts:33-35,53-55`, `useScanHandler.ts:44,73-80`

**Aggregation on State Change**
`useStockOutSession` auto-computes aggregatedItems:
- useEffect watches scannedItems changes
- Calls `aggregateScannedItems()` from validation library
- Groups by design+lot, sums quantities
- Updates aggregatedItems state
Example: `useStockOutSession.ts:58-61`

**Audio Feedback via Web Audio API**
`useScanHandler` generates beep sounds:
- Creates AudioContext, Oscillator, GainNode on each call
- 800Hz sine wave for success, 400Hz for error
- 0.1s duration with exponential gain ramp for smooth decay
- Non-intrusive feedback without external audio files
Example: `useScanHandler.ts:46-66`

**Timestamped Logging**
`useStockOutSession` maintains detailed logs:
- `addLog()` prefixes each entry with ISO timestamp
- Logs stored in logsRef (persists across re-renders)
- Also outputs to console.log for real-time debugging
- `downloadLogs()` exports with session summary header
Example: `useStockOutSession.ts:45-50,75-106`
</patterns>

<critical_notes>
## CRITICAL NOTES

- **Hook Return Values** - Both hooks return objects with destructured values. Orchestrator must destructure correctly: `const { sessionId, scannedItems, addLog, ... } = useStockOutSession()`

- **Ref Synchronization** - Refs MUST be kept in sync with state via useEffect. Missing this causes stale closure bugs in validation: `useStockOutSession.ts:53-55`

- **Session ID Generation** - UUID generated on mount with empty dependency array. For new sessions, call `resetSession()` which generates new UUID and clears logs: `useStockOutSession.ts:38-42,108-117`

- **Scan Handler Dependencies** - `useScanHandler` requires orchestrator to pass: selectedOrder, scannedItemsRef, addLog, addScannedItem. Missing dependencies break validation: `useScanHandler.ts:31-36`

- **Audio Context per Scan** - New AudioContext created for each beep. Browser may limit concurrent contexts, but short duration (0.1s) prevents buildup: `useScanHandler.ts:48`

- **Duplicate Prevention is Synchronous** - `isProcessingScanRef` provides synchronous blocking (ref, not state). Scanner paused immediately after scan detected: `useScanHandler.ts:73-84`

- **Validation Uses Ref, Not State** - `handleScan` passes `scannedItemsRef.current` to validateScan(), not scannedItems state. Critical for preventing stale closure: `useScanHandler.ts:108-112`

- **Debug Data State** - `useScanHandler` exposes debugData state with QR data + validation results. ScanItemsStep passes this to DebugScanModal: `useScanHandler.ts:38-41,119-125`

- **Log Download Side Effects** - `downloadLogs()` creates blob URL, downloads file, cleans up URL. No external dependencies required: `useStockOutSession.ts:75-106`

- **Aggregation Library Dependency** - Both hooks import from `@/lib/features/client-scan-validation`. Ensure this library is available: `useStockOutSession.ts:3-6`, `useScanHandler.ts:3-8`
</critical_notes>

<paved_path>
## PAVED PATH

**Creating New Workflow Hook**
1. Create file in `lib/hooks/` with `use` prefix: `useFeatureName.ts`
2. Define return type interface: `interface UseFeatureNameReturn { ... }`
3. Use refs for synchronous state tracking (prevent stale closures)
4. Keep refs synced with state using useEffect with state dependency
5. Return object with state + handlers for destructuring
6. Document dependencies and usage in hook docstring
Example: `useStockOutSession.ts:15-25`, `useScanHandler.ts:10-29`

**Adding New Feature to Existing Hook**
1. Add state/ref to hook body
2. Implement feature function
3. Add to return object interface
4. Update orchestrator to destructure new values
5. Pass to step components as props if needed

**Implementing Validation Hook**
Follow `useScanHandler` pattern:
1. Accept current state via props (use refs for arrays/objects)
2. Implement validation logic
3. Use ref for synchronous duplicate/race condition prevention
4. Return validation results + handlers
5. Orchestrator passes to components needing validation

**Adding Audio Feedback**
Copy `playSound()` pattern from `useScanHandler.ts:46-66`:
- Create AudioContext, Oscillator, GainNode
- Set frequency based on success/error (high/low)
- Use exponentialRampToValueAtTime for smooth decay
- Keep duration short (0.1s) to avoid overlap

**Debugging Hook Issues**
1. Check hook return values are destructured correctly in orchestrator
2. Verify refs are synced with state via useEffect
3. Check console.log output for timestamped logs
4. Use React DevTools to inspect hook state/refs
5. Add console.log in hook functions to trace execution
</paved_path>
