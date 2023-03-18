# CropCord

Following Google's [amazing shitcode](https://archive.ph/3bpoU), cropped screenshots on Android devices may contain parts you didn't intend to be there...

This script checks your discord data package for these screenshots and will export them to a file `messages.json`

You can use this alongside the code in `src/deleteMessages.js` (with help of Vencord) to go and delete these messages.

## CAUTION

While it's unlikely as this is heavily throttled and uses the official discord client,
this is technically against TOS and you _may_ get banned, however unlikely that may be.

# How To:

unzip your package.zip here and call the folder "package".

```
pnpm i
```

```
pnpm start
```

If you want to download the assets (this takes much longer) you can run it as `pnpm start --download`

This will create the messages.json

Now open Discord (with Vencord loaded) and open the terminal (CTRL+SHIFT+i)

Copy-Paste the contents of deleteMessages.js into the terminal.

now write `const guilds = ` and then paste in the contents of `messages.json` into the end of the line and hit enter.

I recommend clearing the terminal history because that JSON can cause the terminal to bug out because it's so big.

now just run `deleteMessages(guilds);` and wait...

## Notes

This is excessively throttled to avoid any issues. It should just run in the background and you can do your normal discord stuff with it open. Just keep the console open.
