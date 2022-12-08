import {useEffect, useRef, useState} from "react";
import "./App.css";
import 'react-toastify/dist/ReactToastify.css';

import {toast, ToastContainer} from 'react-toastify';


function App() {
  const walletUrl = import.meta.env.VITE_WALLET_URL;
  const walletWindowRef = useRef<Window | null>(null);
  const walletIframeRef = useRef<HTMLIFrameElement>(null);
  const walletConnectedRef = useRef<boolean>(false);
  const [connectedAccounts, setConnectedAccounts] = useState<string[]>([])

  const checkWalletInitialized = () => {
    return new Promise<void>((resolve) => {
      if (walletConnectedRef.current) {
        resolve();

        return;
      }

      const intervalNumber = setInterval(() => {
        console.log('walletConnected', walletConnectedRef.current);
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
      {dappName: "SubProfileDapp", type: "request_accounts"},
      walletUrl
    );
  };

  useEffect(() => {
    const onReceviedWalletMessage = (event: MessageEvent) => {
      if (event.origin !== walletUrl) {
        return;
      }

      console.log(event);
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

  useEffect(() => {
    const walletIframeWindow = walletIframeRef.current?.contentWindow;
    if (!walletIframeWindow) {
      return;
    }

    setTimeout(() => {
      walletIframeWindow.postMessage({type: 'get_accounts'}, '*')
      console.log('posted message get_accounts');
    }, 100);
  })

  const doSignDummy = async (address: string) => {
    await openWallet();

    walletWindowRef.current?.postMessage(
      {dappName: "SubProfileDapp", type: "sign_dummy", account: address, message: "This is a dummy message"},
      walletUrl
    );
  }

  const logout = () => {
    setConnectedAccounts([]);
  }

  return (
    <div className="App">
      <h1>SubProfile Dapp</h1>
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

      {/*<iframe ref={walletIframeRef} src={walletUrl} width={0} height={0} />*/}
    </div>
  );
}

export default App;
