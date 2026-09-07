export function createDraftHighlightQueue<T>(): (
  highlight: T,
  execute: (highlight: T) => Promise<boolean>,
) => Promise<boolean> {
  let pending = Promise.resolve();

  return (highlight, execute) => {
    const result = pending.then(() => execute(highlight));
    pending = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
}
