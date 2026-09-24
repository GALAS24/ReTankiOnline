import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

export default defineConfig({
    plugins: [
        {
            name: 'paints-auto-scanner',
            configureServer(server) {
                // Эндпоинт автоматического сканирования папки paints
                server.middlewares.use('/api/paints', (_req, res) => {
                    const paintsDir = path.resolve(__dirname, 'public/paints');
                    let folders: string[] = [];

                    if (fs.existsSync(paintsDir)) {
                        folders = fs.readdirSync(paintsDir, { withFileTypes: true })
                            .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
                            .map(dirent => dirent.name);
                    }

                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(folders));
                });
            }
        }
    ]
});