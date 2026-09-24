import { html, type SafeHtml } from "../lib/html";
import { layout } from "./layout";

export function loginPage(): SafeHtml {
  const body = html`<div class="login">
  <h1>Asset Tracker</h1>
  <p class="muted">등록된 passkey로 로그인하세요.</p>
  <button id="login-button" type="button">passkey로 로그인</button>
  <p id="status" class="muted"></p>
</div>`;
  return layout({ title: "로그인 · Asset Tracker", page: "login", body });
}

export function registerPage(options: { setupTokenRequired: boolean }): SafeHtml {
  const body = html`<div class="login">
  <h1>Passkey 등록</h1>
  <p class="muted">이 기기에서 사용할 passkey를 등록합니다.</p>
  <label>이름 (선택) <input id="label" type="text" placeholder="예: MacBook Touch ID"></label>
  ${
    options.setupTokenRequired
      ? html`<label>설정 토큰 <input id="setup-token" type="password" autocomplete="off"></label>`
      : html``
  }
  <button id="register-button" type="button">passkey 등록</button>
  <p id="status" class="muted"></p>
</div>`;
  return layout({ title: "Passkey 등록 · Asset Tracker", page: "register", body });
}
