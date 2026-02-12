import Store from "electron-store";
import type { BrowserWindow } from "electron";

interface WindowState {
  x: number | undefined;
  y: number | undefined;
  width: number;
  height: number;
  isMaximized: boolean;
}

const store = new Store<{ windowState: WindowState }>({
  defaults: {
    windowState: {
      x: undefined,
      y: undefined,
      width: 1200,
      height: 800,
      isMaximized: false,
    },
  },
});

export function getWindowState(): WindowState {
  return store.get("windowState");
}

export function trackWindowState(win: BrowserWindow): void {
  const save = () => {
    if (win.isDestroyed()) return;

    const isMaximized = win.isMaximized();
    if (!isMaximized) {
      const bounds = win.getBounds();
      store.set("windowState", {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized: false,
      });
    } else {
      store.set("windowState.isMaximized", true);
    }
  };

  win.on("resize", save);
  win.on("move", save);
  win.on("maximize", save);
  win.on("unmaximize", save);
  win.on("close", save);
}
