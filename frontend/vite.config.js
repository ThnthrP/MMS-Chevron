import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,        // = --host
    port: 5175,
    strictPort: true,  // ถ้า 5175 ไม่ว่าง ให้ error เลย ไม่แอบเด้งไปพอร์ตอื่น
  },
});
