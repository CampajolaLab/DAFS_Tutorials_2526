# SSH Port Forwarding Instructions for Order Book Game


To access the Order Book Game server running on the university network, you need to use SSH port forwarding. This allows you to securely connect to the game server from your own computer, even if the server is not directly accessible from outside the campus network.

**Replace `account@server` with your assigned username and the server's address. The server runs on port 8888.**

---

## 1. Windows


### Using PowerShell or Command Prompt (with OpenSSH)
1. Open PowerShell or Command Prompt.
2. Run:
   ```sh
   ssh -N -f -L 8888:localhost:8888 ifte24_students@ift-severn.cege.ucl.ac.uk
   ```
   - `-N` means do not execute remote commands (just forward ports)
   - `-f` puts ssh in the background after authentication
3. Enter your password when prompted.
4. Open your browser and go to:
   - http://localhost:8888

### Using PuTTY
1. Download and open [PuTTY](https://www.putty.org/).
2. Enter `account@server` in the Host Name field.
3. In the left menu, go to **Connection > SSH > Tunnels**.
4. In **Source port**, enter `8888`. In **Destination**, enter `localhost:8888`.
5. Click **Add**.
6. Go back to **Session** and click **Open**.
7. Log in with your credentials.
8. Open your browser and go to http://localhost:8888

---

## 2. macOS

1. Open the Terminal app.
2. Run:
   ```sh
   ssh -N -f -L 8888:localhost:8888 account@server
   ```
   - `-N` means do not execute remote commands (just forward ports)
   - `-f` puts ssh in the background after authentication
3. Enter your password when prompted.
4. Open your browser and go to:
   - http://localhost:8888

---

## 3. Linux

1. Open a terminal window.
2. Run:
   ```sh
   ssh -N -f -L 8888:localhost:8888 account@server
   ```
   - `-N` means do not execute remote commands (just forward ports)
   - `-f` puts ssh in the background after authentication
3. Enter your password when prompted.
4. Open your browser and go to:
   - http://localhost:8888

---

**Note:**
- If you use the `-N -f` options, the SSH tunnel will run in the background. To close it, you may need to run `ps` to find the ssh process and kill it, or close all SSH sessions.
- If you do not use `-N -f`, keep the SSH window open while you use the game. Closing it will end the connection.
- If you have issues, contact your instructor or teaching assistant.
