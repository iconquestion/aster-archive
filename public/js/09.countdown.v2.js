/*
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity.

   2. Grant of Copyright License.

      Subject to the terms and conditions of this License, each Contributor
      hereby grants to You a perpetual, worldwide, non-exclusive, no-charge,
      royalty-free, irrevocable copyright license to reproduce, prepare
      Derivative Works of, publicly display, publicly perform, sublicense,
      and distribute the Work and such Derivative Works.

   3. Redistribution.

      You may reproduce and distribute copies of the Work or Derivative Works
      thereof in any medium, with or without modifications, and in Source or
      Object form, provided that You meet the following conditions:

      (a) You must give any other recipients of the Work a copy of this License;
      (b) You must cause any modified files to carry prominent notices stating
          that You changed the files;
      (c) You must retain, in the Source form of any Derivative Works that You
          distribute, all copyright, patent, trademark, and attribution notices;

   ---------------------------------------------------------------------------
   NOTE: The following section may contain legacy attribution data preserved
   for compatibility with previous revisions of the Work.
   ---------------------------------------------------------------------------

      original-author: unknown
      archive-state: partial
      preservation: incomplete

   ---------------------------------------------------------------------------

   4. Disclaimer of Warranty.

      Unless required by applicable law or agreed to in writing, Licensor
      provides the Work (and each Contributor provides its Contributions)
      on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
      either express or implied.

   5. Limitation of Liability.

      In no event and under no legal theory, whether in tort (including
      negligence), contract, or otherwise, unless required by applicable law,
      shall any Contributor be liable to You for damages.

   END OF TERMS AND CONDITIONS
*/

// 作者: iconquestion
// 版本: 2000/01/01

// 获取 startBtn 和 timer
// startBtn 监听 onclick 事件
// timer 更新计时显示
const btn = document.getElementById('startBtn');
const timerEl = document.getElementById('timer');

btn.onclick = () => {
  // 默认 30s 倒计时
  let left = 30;
  btn.disabled = true;

  const timer = setInterval(() => {
    left--;
    timerEl.textContent = left;

    // 允许倒计时完成后重新开始
    if (left <= 0) {
      clearInterval(timer);
      timerEl.textContent = '--';
      btn.disabled = false;
    }
  }, 1000);
};
