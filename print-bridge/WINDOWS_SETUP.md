# Print bridge on Windows, 24/7

Run in PowerShell, from the `print-bridge` folder. Needs Node 20.12+ and a filled-in `.env`.

```powershell
# 1. Check the printers first (add --kick-drawer to pulse the cash drawer)
npm run test-printers

# 2. PM2 + auto-start on Windows boot + log rotation
npm i -g pm2 pm2-windows-startup pm2-logrotate
pm2-startup install
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 14
pm2 start ecosystem.config.cjs
pm2 save
```

Daily use: `pm2 status`, `pm2 logs dopa-bridge`, `pm2 restart dopa-bridge`.
After editing `.env`: `pm2 restart dopa-bridge --update-env`.

`pm2-windows-startup` runs PM2 at user logon, so enable Windows auto-login for the POS user
(or use Task Scheduler "At startup" running `pm2 resurrect` as SYSTEM).
