import { Controller, Get, Header } from '@nestjs/common';

/** GET / shows a short message instead of "Cannot GET /" */
@Controller()
export class AppController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  home(): string {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>InnVibe API</title>
  <style>
    :root { color-scheme: light dark; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; background: #faf7f2; color: #14213d; }
    main { width: min(92vw, 440px); padding: 40px 32px; background: #fff; border: 1px solid #e6dfd2; border-radius: 12px; text-align: center; }
    h1 { margin: 0 0 4px; font-size: 28px; font-family: Georgia, 'Times New Roman', serif; }
    h1 span { color: #8a5a00; }
    .status { display: inline-flex; align-items: center; gap: 8px; margin: 18px 0 6px; padding: 6px 14px; border-radius: 999px; background: #e8f5ec; color: #166534; font-size: 14px; font-weight: 600; }
    .status i { width: 8px; height: 8px; border-radius: 50%; background: #16a34a; }
    p { margin: 8px 0 0; color: #5b6475; font-size: 15px; line-height: 1.5; }
    @media (prefers-color-scheme: dark) {
      body { background: #0f1524; color: #f1ede4; }
      main { background: #172036; border-color: #2a3550; }
      h1 span { color: #d4a24c; }
      .status { background: #12301f; color: #86efac; }
      p { color: #a4adc0; }
    }
  </style>
</head>
<body>
  <main>
    <h1>Inn<span>Vibe</span></h1>
    <p>Hotel reservation API</p>
    <div class="status"><i></i>Service is running</div>
    <p>This address serves the InnVibe booking system. Please use the InnVibe website to browse rooms and make a reservation.</p>
  </main>
</body>
</html>`;
  }
}
