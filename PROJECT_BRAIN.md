# QuoteMaster Project Brain

## Critical Bug Fixes & Patterns

### ✅ RESOLVED: Kitchen Management Modal UI Freeze Bug (DEFINITIVE SOLUTION)

**Issue:** UI freeze after canceling edit modal operations
**Root Cause:** Double-fire event loop in `onOpenChange` pattern causing bidirectional Parent ↔ Child triggers
**Solution:** Explicit `onClose` callback pattern breaking the event loop with one-way communication flow

#### ❌ INCORRECT PATTERN (Causes Event Loop):
```typescript
// BAD: Bidirectional event triggering
<Dialog onOpenChange={(open) => {
  if (!open) modalController.closeModal(); // Triggers state change
}} />

const closeModal = () => {
  setActiveModal('none'); // This triggers Dialog onOpenChange again!
};
// ↑ Creates infinite Parent ↔ Child event loop!
```

#### ✅ CORRECT PATTERN (One-Way Flow):
```typescript
// GOOD: Explicit one-way callback
<Dialog onOpenChange={(isOpen) => {
  if (!isOpen) onClose(); // Direct callback, no state loop
}} />

<Button onClick={() => {
  form.reset();
  onClose(); // Direct action, no event chain
}} />

const closeModal = () => {
  setActiveModal('none'); // Only changes state, no events
};
```

#### Root Cause Deep Dive:
1. **Function Reference Instability**: Data fetching functions (`fetchKitchens`, `refreshKitchens`) recreated every render
2. **useEffect Infinite Loop**: `useEffect(() => fetchKitchens(), [fetchKitchens])` triggered on every render
3. **Fast Refresh Confusion**: Hot module reloader detected "changes" due to unstable function references
4. **Component Remount Cascade**: Entire page component unmounted/remounted, causing UI freeze
5. **Object Reference Instability**: Modal controller object recreated even with individual `useCallback` functions
6. **Child Component Re-renders**: Components receiving unstable props triggered unnecessary re-renders
7. **Radix UI State Corruption**: Dialog components attempted cleanup/reinitialization on every prop change
8. **Event Listener Accumulation**: DOM event handlers were not properly removed

#### Critical Requirements for ALL React Components:
1. **ALWAYS** use `useCallback` for ALL functions passed as props or used in `useEffect`
2. **ALWAYS** use `useMemo` for objects passed as props to prevent unnecessary re-renders
3. **ALWAYS** provide correct dependency arrays for `useCallback` and `useMemo`
4. **ALWAYS** add `DialogDescription` to prevent accessibility warnings
5. **ALWAYS** use `React.startTransition` for batched state updates
6. **NEVER** create object literals or functions in render cycles when passing to child components
7. **NEVER** pass unstable function references to `useEffect` dependencies

#### Files Involved:
- `app/(dashboard)/danh-muc/bep/page.tsx` - Complete modal controller implementation
- `components/features/kitchens/kitchen-form-modal.tsx` - Accessibility fix with DialogDescription

#### Debugging Pattern for Similar Issues:
1. Check for object/function reference stability using React DevTools Profiler
2. Look for React accessibility warnings in console
3. Verify that child components aren't re-rendering unnecessarily
4. Check dependency arrays in `useCallback` and `useMemo`

#### Production-Ready Modal Controller Template:
```typescript
export function useStableModalController<T>() {
  const [activeModal, setActiveModal] = useState<string>('none');
  const [modalData, setModalData] = useState<T | null>(null);

  // Step 1: Memoize individual functions
  const openModal = useCallback((type: string, data?: T) => {
    setModalData(data || null);
    setActiveModal(type);
  }, []);

  const closeModal = useCallback(() => {
    React.startTransition(() => {
      setActiveModal('none');
      setModalData(null);
    });
  }, [activeModal]);

  // Step 2: Memoize the controller object
  const controller = useMemo(() => ({
    openModal,
    closeModal
  }), [openModal, closeModal]);

  return { activeModal, modalData, controller };
}
```

**Status:** ✅ PRODUCTION READY
**Last Updated:** 2025-09-19
**Impact:** Critical UI functionality restored with stable object references