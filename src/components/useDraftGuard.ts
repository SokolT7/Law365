"use client";
import { useEffect } from "react";
/** Drafts remain in component memory; warn before reload or leaving their workspace. */
export default function useDraftGuard(dirty:boolean) {
  useEffect(()=>{
    if(!dirty)return;
    const unload=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
    const navigate=(event:MouseEvent)=>{
      const link=(event.target as Element)?.closest?.("a[href]");
      if(!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button!==0 || link.getAttribute("target")==="_blank")return;
      const url=new URL(link.getAttribute("href")!,window.location.href);
      if(url.origin===window.location.origin && url.pathname===window.location.pathname)return;
      if(!window.confirm("Imate neposlano pitanje ili prilog. Napustiti radni prostor i odbaciti nacrt?")){event.preventDefault();event.stopPropagation();}
    };
    window.addEventListener("beforeunload",unload);document.addEventListener("click",navigate,true);
    return()=>{window.removeEventListener("beforeunload",unload);document.removeEventListener("click",navigate,true);};
  },[dirty]);
}
