import { serve } from "bun";

const isDev = process.env.NODE_ENV !== "production";

const server = serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    console.log(`Request for: ${url.pathname}`);

    // Serve index.html for the root path
    if (url.pathname === "/") {
      let html = await Bun.file("index.html").text();
      
      // In production, replace the script source with the bundled version
      if (!isDev) {
        html = html.replace(
          '<script type="module" src="/src/index.ts"></script>',
          '<script type="module" src="/dist/index.js"></script>'
        );
      }
      
      return new Response(html, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // In development, serve source files
    if (isDev && url.pathname.startsWith("/src/")) {
      let filePath = url.pathname.slice(1);
      console.log(`Original filePath: ${filePath}`);
      
      // Handle module imports without extension
      if (!filePath.includes('.')) {
        // Try with .ts extension first
        const tsPath = `${filePath}.ts`;
        console.log(`Trying TypeScript path: ${tsPath}`);
        const tsFile = Bun.file(tsPath);
        if (await tsFile.exists()) {
          filePath = tsPath;
          console.log(`Found TypeScript file: ${filePath}`);
        } else {
          console.error(`TypeScript file not found: ${tsPath}`);
          return new Response(`Module not found: ${filePath}`, { 
            status: 404,
            headers: {
              'Content-Type': 'text/plain',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
      }
      
      console.log(`Final filePath: ${filePath}`);
      
      // Handle TypeScript files
      if (filePath.endsWith('.ts')) {
        try {
          const file = Bun.file(filePath);
          if (!await file.exists()) {
            console.error(`File not found: ${filePath}`);
            return new Response(`File not found: ${filePath}`, { 
              status: 404,
              headers: {
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': '*'
              }
            });
          }

          console.log(`Transpiling file: ${filePath}`);
          const transpiler = new Bun.Transpiler({
            loader: "ts",
            target: "browser"
          });
          
          const code = await file.text();
          console.log(`File content length: ${code.length} bytes`);
          
          const transpiled = await transpiler.transform(code);
          console.log(`Transpiled content length: ${transpiled.length} bytes`);
          
          return new Response(transpiled, {
            headers: {
              'Content-Type': 'application/javascript',
              'Access-Control-Allow-Origin': '*'
            }
          });
        } catch (error: any) {
          console.error(`Error processing ${filePath}:`, error);
          console.error('Error details:', {
            message: error?.message,
            stack: error?.stack,
            name: error?.name
          });
          return new Response(
            `Error processing file: ${error?.message || 'Unknown error'}\nStack: ${error?.stack || 'No stack trace'}`,
            { 
              status: 500,
              headers: {
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': '*'
              }
            }
          );
        }
      }
      
      // Serve other files as-is
      const file = Bun.file(filePath);
      if (!await file.exists()) {
        console.error(`File not found: ${filePath}`);
        return new Response(`File not found: ${filePath}`, { 
          status: 404,
          headers: {
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      return new Response(file, {
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // In production, serve bundled files
    if (!isDev && url.pathname.startsWith("/dist/")) {
      const filePath = url.pathname.slice(1);
      const file = Bun.file(filePath);
      if (!await file.exists()) {
        console.error(`File not found: ${filePath}`);
        return new Response(`File not found: ${filePath}`, { 
          status: 404,
          headers: {
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      return new Response(file, {
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    console.error(`Not found: ${url.pathname}`);
    return new Response("Not Found", { 
      status: 404,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      }
    });
  },
});

console.log(`Server running at http://localhost:${server.port} in ${isDev ? "development" : "production"} mode`); 