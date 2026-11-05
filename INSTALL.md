# Install ATLAS

## One-line install

On macOS or Linux with Git, Python 3, Node.js, and npm installed, run:

```sh
curl -fsSL https://raw.githubusercontent.com/kpulik/atlas-company-brain/main/install.sh | bash
```

This clones the public repository to `~/atlas-company-brain`, creates an isolated Python environment, installs backend requirements, and runs `npm ci` and the frontend production build. To choose a folder, add it after `bash`, for example `bash -s -- "$HOME/Projects/atlas"`. For the optional ChatGPT subscription provider on macOS, use `curl -fsSL https://raw.githubusercontent.com/kpulik/atlas-company-brain/main/install.sh | bash -s -- --with-chatgpt-provider`.

To install this checkout without downloading the installer, run `./install.sh [directory]` from its folder. `./install.sh --dry-run` prints the planned actions without changing files.

## Start

```sh
~/atlas-company-brain/run.sh
```

Open <http://127.0.0.1:5173>. The API listens only on localhost at port 8000. Press Ctrl-C to stop both processes. API keys belong in the environment of the shell that starts ATLAS. The installer does not create or collect secrets. For example, set `OPENAI_API_KEY` before running the script if you intend to use the OpenAI API. The demo works in excerpt mode without a key.

The optional ChatGPT subscription provider has a separate sign-in and consent flow. Its credentials use macOS Keychain, and it does not use Codex credentials. See [provider details](chatgpt-provider/README.md).

## Uninstall

```sh
~/atlas-company-brain/uninstall.sh
```

This removes only generated virtual environment, Node dependencies, and build output. It preserves the source checkout, SQLite database, reports/settings stored there, and other files. To also remove the database, run `uninstall.sh --purge-data` and type `DELETE` at its explicit confirmation prompt. `--dry-run` lists intended paths without deleting anything. To remove the source checkout as well, delete its specific install directory yourself after uninstalling.

Do not use real company data with this demo. The role picker is not authentication. See the [project README](README.md) for limitations and provider configuration.
