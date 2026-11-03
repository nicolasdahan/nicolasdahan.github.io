document.querySelectorAll(".eml").forEach(function(a){
  var s=[].slice.call(atob(a.dataset.a+a.dataset.b)).reverse().join("");
  a.href="mailto:"+s;
});
var T=[].slice.call(document.querySelectorAll("[role=tab]")),Q=[].slice.call(document.querySelectorAll("[role=tabpanel]"));
function S(i,f){T.forEach(function(t,j){var on=j===i;t.setAttribute("aria-selected",on?"true":"false");t.tabIndex=on?0:-1});Q.forEach(function(p,j){p.hidden=j!==i;p.classList.toggle("on",j===i)});if(f)T[i].focus()}
function O(o,on){o.parentElement.querySelectorAll(".opn").forEach(function(x){var v=x===o&&on;x.hidden=!v;x.classList.toggle("on",v);var b=document.querySelector("[aria-controls='"+x.id+"']");if(b)b.setAttribute("aria-expanded",v?"true":"false")})}
function H(){
  var h=decodeURIComponent(location.hash.slice(1));if(!h)return;
  var e=document.getElementById(h);if(!e)return;
  var p=e.closest("[role=tabpanel]");if(p)S(Q.indexOf(p));
  var o=e.closest(".opn");if(o)O(o,true);
  if(e!==p)e.scrollIntoView();else p.blur();
}
document.querySelectorAll(".opn").forEach(function(x){x.hidden=true});
document.querySelectorAll(".tg").forEach(function(b){b.addEventListener("click",function(){var o=document.getElementById(b.getAttribute("aria-controls"));O(o,o.hidden)})});
T.forEach(function(t,i){
  t.addEventListener("click",function(){S(i);history.replaceState(null,"","#"+Q[i].id)});
  t.addEventListener("keydown",function(e){var n=T.length,k=e.key,g=k==="ArrowRight"||k==="ArrowDown"?(i+1)%n:k==="ArrowLeft"||k==="ArrowUp"?(i-1+n)%n:k==="Home"?0:k==="End"?n-1:-1;if(g<0)return;e.preventDefault();S(g,true);history.replaceState(null,"","#"+Q[g].id)});
});
if(T.length)S(0);
H();addEventListener("hashchange",H);
var F=[].slice.call(document.querySelectorAll(".fb"));
F.forEach(function(b){b.addEventListener("click",function(){
  var f=b.dataset.f;
  F.forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")});
  document.querySelectorAll(".it").forEach(function(a){a.hidden=!(f==="all"||(f==="first"&&a.dataset.first==="yes")||a.dataset.theme===f)});
  document.querySelectorAll(".yr").forEach(function(y){y.hidden=!y.querySelector(".it:not([hidden])")});
})});
document.querySelectorAll("[data-copy]").forEach(function(b){b.addEventListener("click",function(){
  var n=b.parentElement.querySelector("pre,p:not(.oh)"),l=b.textContent;
  if(!navigator.clipboard)return;
  navigator.clipboard.writeText(n.textContent.trim()).then(function(){b.textContent="Copied";setTimeout(function(){b.textContent=l},1500)});
})});
