export function createDraftHighlightQueue<T>(): (
  highlight: T,
  execute: (highlight: T) => Promise<boolean>,
) => Promise<boolean> {
  let isRunning = false;
  let latest: {
    highlight: T;
    execute: (highlight: T) => Promise<boolean>;
    resolve: (result: boolean) => void;
  } | null = null;

  const run = async (
    item: NonNullable<typeof latest>,
  ) => {
    isRunning = true;
    try {
      item.resolve(await item.execute(item.highlight));
    } catch {
      item.resolve(false);
    } finally {
      const next = latest;
      latest = null;
      if (next) {
        void run(next);
      } else {
        isRunning = false;
      }
    }
  };

  return (highlight, execute) => new Promise<boolean>((resolve) => {
    const item = { highlight, execute, resolve };
    if (!isRunning) {
      void run(item);
      return;
    }
    latest?.resolve(false);
    latest = item;
  });
}
