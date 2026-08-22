# logs

## Run locally

This is a static web app. Start a local server from the project directory:

```bash
python3 -m http.server 3000
```

Open http://localhost:3000 in your browser.

## Customize log prompts

Each log type has its own editable `fields` section near the top of `app.js` in `logTypeConfig`. Add, remove, or change fields in the relevant topic section to make its entry form ask for completely different information. Supported field types are regular inputs, `textarea`, and `select` with `options`.

The access code is requested once when the website is first opened in a browser tab. The unlocked state is kept for that tab's session while you move between log types and views.

## Forward the port in VS Code

With the server running, open the **Ports** panel in VS Code, locate port `3000`, and choose **Forward Port**. Open the forwarded address shown in the panel to view the app remotely.
