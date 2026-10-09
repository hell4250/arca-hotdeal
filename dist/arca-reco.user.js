
 // ==UserScript==
 // @name         Arca.live - 핫딜 추천수 하이라이트
 // @namespace    https://arca.live/
 // @version      1.0.0
 // @description  핫딜 게시글의 추천수가 설정 기준 이상이면 테두리로 강조
 // @match        https://arca.live/b/hotdeal*
 // @run-at       document-idle
 // @grant        none
 // ==/UserScript==

 (() => {
     'use strict';

     const CONFIG = {
         minRecommend: 10,
         storageKey: 'arca-hotdeal-min-recommend',
         selectors: {
             buttonContainer: '.buttons',
             row: '.vrow',
             recommend: '.col-rate'
         }
     };

     const STYLE_ID = 'arca-hotdeal-highlight-style';
     const SETTINGS_ID = 'arca-hotdeal-settings';
     const HIGHLIGHT_CLASS = 'arca-hotdeal-highlighted';

     let minRecommend = loadThreshold();
     let observer;
     let scanScheduled = false;

     function loadThreshold() {
         const saved = Number(localStorage.getItem(CONFIG.storageKey));

         return Number.isFinite(saved) && saved >= 0
             ? saved
             : CONFIG.minRecommend;
     }

     function addStyles() {
         if (document.getElementById(STYLE_ID)) return;

         const style = document.createElement('style');
         style.id = STYLE_ID;
         style.textContent = `
             .${HIGHLIGHT_CLASS} {
                 box-shadow: inset 0 0 0 2px #ff8c42 !important;
                 border-radius: 4px;
             }

             #${SETTINGS_ID} {
                 position: relative;
             }

             #${SETTINGS_ID}-panel {
                 position: absolute;
                 top: calc(100% + 6px);
                 right: 0;
                 z-index: 9999;
                 width: 230px;
                 padding: 12px;
                 background: var(--bs-body-bg, #fff);
                 color: var(--bs-body-color, #222);
                 border: 1px solid #aaa;
                 border-radius: 8px;
                 box-shadow: 0 4px 14px #0002;
             }

             #${SETTINGS_ID}-panel[hidden] {
                 display: none;
             }

             #${SETTINGS_ID}-panel label {
                 display: block;
                 margin-bottom: 8px;
                 font-size: 13px;
             }

             #${SETTINGS_ID}-panel input {
                 box-sizing: border-box;
                 width: 100%;
                 margin: 6px 0 10px;
                 padding: 6px;
                 color: inherit;
                 background: transparent;
                 border: 1px solid #aaa;
                 border-radius: 4px;
             }

             #${SETTINGS_ID}-panel button {
                 padding: 5px 10px;
                 border: 1px solid #aaa;
                 border-radius: 4px;
                 cursor: pointer;
             }

             #${SETTINGS_ID}-panel .arca-settings-actions {
                 display: flex;
                 justify-content: flex-end;
                 gap: 6px;
             }
         `;

         document.head.appendChild(style);
     }

     function createSettingsButton() {
         const container = document.querySelector(
             CONFIG.selectors.buttonContainer
         );

         if (!container || document.getElementById(SETTINGS_ID)) return;

         const wrapper = document.createElement('div');
         wrapper.id = SETTINGS_ID;
         wrapper.className = 'btn-group';

         const toggle = document.createElement('button');
         toggle.type = 'button';
         toggle.className = 'btn btn-sm';
         toggle.textContent = '추천수 설정';
         toggle.setAttribute('aria-expanded', 'false');

         const panel = document.createElement('div');
         panel.id = `${SETTINGS_ID}-panel`;
         panel.hidden = true;

         const label = document.createElement('label');
         label.textContent = '하이라이트 최소 추천수';

         const input = document.createElement('input');
         input.type = 'number';
         input.min = '0';
         input.step = '1';
         input.value = String(minRecommend);

         const actions = document.createElement('div');
         actions.className = 'arca-settings-actions';

         const cancel = document.createElement('button');
         cancel.type = 'button';
         cancel.textContent = '취소';

         const save = document.createElement('button');
         save.type = 'button';
         save.textContent = '저장';

         label.appendChild(input);
         actions.append(cancel, save);
         panel.append(label, actions);
         wrapper.append(toggle, panel);

         toggle.addEventListener('click', () => {
             panel.hidden = !panel.hidden;
             toggle.setAttribute(
                 'aria-expanded',
                 String(!panel.hidden)
             );

             if (!panel.hidden) {
                 input.value = String(minRecommend);
                 input.focus();
             }
         });

         cancel.addEventListener('click', () => {
             panel.hidden = true;
             toggle.setAttribute('aria-expanded', 'false');
         });

         save.addEventListener('click', () => {
             const value = input.value.trim();
             const threshold = Number(value);

             if (
                 value === '' ||
                 !Number.isSafeInteger(threshold) ||
                 threshold < 0
             ) {
                 input.focus();
                 return;
             }

             minRecommend = threshold;
             localStorage.setItem(
                 CONFIG.storageKey,
                 String(minRecommend)
             );

             panel.hidden = true;
             toggle.setAttribute('aria-expanded', 'false');
             scheduleScan();
         });

         input.addEventListener('keydown', event => {
             if (event.key === 'Enter') save.click();

             if (event.key === 'Escape') cancel.click();
         });

         // 설정 버튼을 항상 버튼 영역의 가장 오른쪽에 배치
         container.appendChild(wrapper);
     }

     function updateRow(row) {
         const recommendElement = row.querySelector(
             CONFIG.selectors.recommend
         );

         const recommendText = recommendElement?.textContent.trim();
         const recommend = Number(recommendText);

         const shouldHighlight =
             recommendText !== undefined &&
             recommendText !== '' &&
             Number.isFinite(recommend) &&
             recommend >= minRecommend;

         row.classList.toggle(
             HIGHLIGHT_CLASS,
             shouldHighlight
         );
     }

     function scanRows() {
         if (location.pathname !== '/b/hotdeal') {
             document.querySelectorAll(`.${HIGHLIGHT_CLASS}`)
                 .forEach(row => row.classList.remove(HIGHLIGHT_CLASS));
             return;
         }

         document.querySelectorAll(CONFIG.selectors.row)
             .forEach(updateRow);
     }

     function scheduleScan() {
         if (scanScheduled) return;

         scanScheduled = true;

         requestAnimationFrame(() => {
             scanScheduled = false;

             if (location.pathname !== '/b/hotdeal') {
                 document.querySelectorAll(`.${HIGHLIGHT_CLASS}`)
                     .forEach(row => row.classList.remove(HIGHLIGHT_CLASS));
                 return;
             }

             createSettingsButton();
             scanRows();
         });
     }

     function init() {
         if (location.pathname !== '/b/hotdeal') return;

         addStyles();
         createSettingsButton();
         scanRows();

         observer = new MutationObserver(scheduleScan);
         observer.observe(document.body, {
             childList: true,
             subtree: true,
             characterData: true
         });
     }

     init();
 })();