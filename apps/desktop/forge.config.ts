import type { ForgeConfig } from "@electron-forge/shared-types";
import { VitePlugin } from "@electron-forge/plugin-vite";

const config: ForgeConfig = {
  packagerConfig: {
    name: "AMA",
    executableName: "ama",
    appBundleId: "com.ama.desktop",
    icon: "./assets/icon",
    darwinDarkModeSupport: true,
    asar: true,
    protocols: [
      {
        name: "AMA",
        schemes: ["ama"],
      },
    ],
    extraResource: ["../../packages/cli/dist"],
  },
  makers: [
    {
      name: "@electron-forge/maker-dmg",
      platforms: ["darwin"],
      config: {
        name: "AMA",
        icon: "./assets/icon.png",
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin", "linux"],
    },
    {
      name: "@electron-forge/maker-deb",
      platforms: ["linux"],
      config: {
        options: {
          name: "ama",
          productName: "AMA",
          icon: "./assets/icon.png",
        },
      },
    },
    {
      name: "@electron-forge/maker-rpm",
      platforms: ["linux"],
      config: {
        options: {
          name: "ama",
          productName: "AMA",
          icon: "./assets/icon.png",
        },
      },
    },
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "src/main/main.ts",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          entry: "src/main/preload.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.ts",
        },
      ],
    }),
  ],
};

export default config;
