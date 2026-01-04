## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Run the app:
   App accessible in http://192.168.0.164:7001/ and is run via `npm run dev:dual`
   Run in background: `setsid nohup npm run dev:dual > dev-dual.out 2>&1 < /dev/null &`
   Stop background process: `kill -9 $(lsof -ti :3000 -ti :3001 -ti :7001 -ti :7002)`