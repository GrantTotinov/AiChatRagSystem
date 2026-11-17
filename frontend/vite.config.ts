import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// Dev: Vite proxies /api to the ASP.NET Core API, so there is no CORS to configure.
// Build: the bundle goes to the API's wwwroot and `dotnet run` serves the whole app.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: { '/api': 'http://localhost:5261' },
  },
  build: {
    outDir: '../AiDocChat.Api/wwwroot',
    emptyOutDir: true,
  },
})
