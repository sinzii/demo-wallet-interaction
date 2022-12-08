import {useEffect, useRef, useState} from "react";
import "./App.css";
import {Keyring} from "@polkadot/keyring";

const DEFAULT_MASTER_PASSWORD = 'super_secret'

const MNEMONICS = [
  'forget inside crane social confirm winter evidence ancient flash pretty orange history',
  'radar worth gown mobile federal face cushion someone cake rural lawsuit census'
];

const keyring = new Keyring();
const defaultPairs = MNEMONICS.map((one, index) => keyring.addFromUri(`${one}///${DEFAULT_MASTER_PASSWORD}`,{ name: `Account ${index + 1}` }, 'ed25519'));

function App() {
  const [data, setData] = useState<any>();
  const dappWindowRef = useRef<Window | null>(null);
  const dappUrl = import.meta.env.VITE_DAPP_URL;
  const ready = useRef<boolean>(false)
  console.log('render wallet');

  useEffect(() => {
    if (!(window.opener || window.top) || ready.current) {
      return;
    }

    ready.current = true;

    const dapp = window.opener || window.top;

    dapp.postMessage({type: window.opener ? 'initialized_tab' : 'initialized_iframe'}, '*');
  }, [ready]);

  useEffect(() => {
    // set up the accounts
  })

  useEffect(() => {
    const onNewMessage = (event: MessageEvent<any>) => {
      console.log(event);
      console.log(event.origin, dappUrl, event.origin !== dappUrl);

      if (event.origin !== dappUrl) {
        return;
      }

      const {type} = event.data || {};

      dappWindowRef.current = event.source as Window;
      if (type === 'request_accounts' || type === 'sign_dummy') {
        setData(event.data);
      } else if (type === 'get_accounts') {
        dappWindowRef.current?.postMessage({type: 'get_accounts', accounts: defaultPairs.map(one => one.address)}, dappUrl);
      }
    };

    window.addEventListener("message", onNewMessage, false);

    return () => {
      window.removeEventListener("message", onNewMessage, false);
    };
  }, []);

  const doApprove = () => {
    if (!dappWindowRef.current) {
      return;
    }

    dappWindowRef.current.postMessage(
      {type: 'request_accounts', accounts: defaultPairs.map(one => one.address)},
      dappUrl
    );
    window.close();
  };

  const doSign = (address: string, message: string) => {
    if (!dappWindowRef.current) {
      return;
    }

    const pair = defaultPairs.find(one => one.address === address);
    if (!pair) {
      throw Error('Account does not exist!');
    }

    const signature = pair.sign(message);

    dappWindowRef.current.postMessage(
      {type: 'sign_dummy', account: address, signature},
      dappUrl
    );
    window.close();
  }

  const doReject = (type: string) => {
    if (!dappWindowRef.current) {
      return;
    }

    dappWindowRef.current.postMessage(
      {type, status: 'rejected'},
      dappUrl
    );

    window.close();
  }

  return (
    <div className="App">
      <h1>SubProfile Wallet</h1>
      {data && (
        <div>
          <p>DappName: {data.dappName}</p>
          <p>Request: {data.type}</p>
          {data.type === 'request_accounts' && (
            <>
              <p>Accounts</p>
              <ul>
                {defaultPairs.map((pair, index) => (<li key={index}>{pair.address}</li>))}
              </ul>

              <button onClick={doApprove}>Approve</button>
              <button onClick={() => doReject(data.type)}>Cancel</button>
            </>
          )}
          {data.type === 'sign_dummy' && (
            <>
              <p>Account to Sign: {data.account}</p>
              <p>Message to sign: {data.message}</p>

              <button onClick={() => doSign(data.account, data.message)}>Sign</button>
              <button onClick={() => doReject(data.type)}>Cancel</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
