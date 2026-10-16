import { useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { sitePath } from "../site-path";

const codes = [
  { key: "join", title: "加入我们", hint: "使用 QQ 扫码联系" },
  { key: "sponsor", title: "赞助我们", hint: "使用微信扫码赞助" },
] as const;

export default function CommunityCodes() {
  const dialog = useRef<HTMLDialogElement>(null), titleId = useId();
  const [selected, setSelected] = useState<(typeof codes)[number] | null>(null);
  function show(code: (typeof codes)[number]) {
    setSelected(code);
    if (!dialog.current?.open) dialog.current?.showModal();
  }
  function close() { dialog.current?.close(); }
  return <>
    <div className="community-codes" aria-label="联系与支持">
      {codes.map(code => <button className="community-code" type="button" key={code.key} onClick={() => show(code)} aria-label={`${code.title}，放大二维码`} aria-haspopup="dialog">
        <span>{code.title}</span>
        <img src={sitePath(`assets/community/${code.key}.svg`)} alt="" width={64} height={64}/>
      </button>)}
    </div>
    <dialog className="community-dialog" ref={dialog} aria-labelledby={titleId} onClose={() => setSelected(null)} onClick={event => { if (event.target === dialog.current) close(); }}>
      <div className="community-dialog-heading"><h2 id={titleId}>{selected?.title}</h2><button type="button" onClick={close} aria-label="关闭二维码" autoFocus><X size={20}/></button></div>
      {selected && <><p>{selected.hint}</p><img className="community-dialog-qr" src={sitePath(`assets/community/${selected.key}.png`)} alt={`${selected.title}二维码`}/><small>手机可长按保存后，在对应 App 中识别。</small></>}
    </dialog>
  </>;
}
