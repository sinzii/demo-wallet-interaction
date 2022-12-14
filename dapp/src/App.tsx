import {useEffect, useRef, useState} from "react";
import "./App.css";
import 'react-toastify/dist/ReactToastify.css';

import {toast, ToastContainer} from 'react-toastify';


function App() {
  const walletUrl = import.meta.env.VITE_WALLET_URL;
  const walletWindowRef = useRef<Window | null>(null);
  const walletConnectedRef = useRef<boolean>(false);
  const [connectedAccounts, setConnectedAccounts] = useState<string[]>([])

  const checkWalletInitialized = () => {
    return new Promise<void>((resolve) => {
      if (walletConnectedRef.current) {
        resolve();

        return;
      }

      const intervalNumber = setInterval(() => {
        if (walletConnectedRef.current) {
          clearInterval(intervalNumber);
          resolve();
        }
      }, 10)
    });
  }

  const openWallet = async () => {
    const walletWindow = window.open(walletUrl);
    if (!walletWindow) {
      throw new Error('Cannot connect wallet');
    }

    walletWindowRef.current = walletWindow;
    walletConnectedRef.current = false;

    await checkWalletInitialized();
  }

  const connectWallet = async () => {
    await openWallet();

    walletWindowRef.current?.postMessage(
      {dappName: "CoongDapp", type: "request_accounts"},
      walletUrl
    );
  };

  useEffect(() => {
    const onReceviedWalletMessage = (event: MessageEvent) => {
      if (event.origin !== walletUrl) {
        return;
      }

      const {type, accounts, status} = event.data || {};
      if (status === 'rejected') {
        toast.error(`Action ${type} rejected`);
        return;
      }

      if (type === 'initialized_tab') {
        walletConnectedRef.current = true;
      } else if (type === 'request_accounts') {
        toast.success(`${accounts.length} accounts connected`)
        setConnectedAccounts(accounts);
      } else if (type === 'sign_dummy') {
        toast.success(`Sign successful, signature: ${event.data.signature.toString()}`);
      }
    };

    window.addEventListener("message", onReceviedWalletMessage, false);

    return () => {
      window.removeEventListener("message", onReceviedWalletMessage, false);
    };
  }, []);

  const doSignDummy = async (address: string) => {
    await openWallet();

    walletWindowRef.current?.postMessage(
      {dappName: "CoongDapp", type: "sign_dummy", account: address, message: "This is a dummy message"},
      walletUrl
    );
  }

  const logout = () => {
    setConnectedAccounts([]);
  }

  return (
    <div className="App">
      <h1>Coong Dapp</h1>
      {connectedAccounts.length > 0 ? (
        <div>
          <h3>Connected Accounts</h3>
          <ul>
            {connectedAccounts.map((one, index) => (
              <li key={index} style={{paddingBottom: 10}}>
                <span>{one}</span>
                <button style={{marginLeft: 10}} onClick={() => doSignDummy(one)}>Sign Dummy</button>
              </li>
            ))}
          </ul>
          <button onClick={logout}>Log out</button>
        </div>
      ) : (
        <div className="card">
          <button onClick={connectWallet}>Connect Wallet</button>
        </div>
      )}

      <ToastContainer/>
    </div>
  );
}

export default App;
