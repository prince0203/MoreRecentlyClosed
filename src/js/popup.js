// 普通に復元するとアクティブウィンドウ以外に復元されることがあるため、復元後にアクティブウィンドウに移動
const restoreTab = (id) => {
  // 現在のウィンドウを取得
  chrome.windows.getCurrent({ windowTypes: ['normal'] }, (currentWindow) => {
    chrome.sessions.restore(id, (restoredSession) => {
      // 新しいウィンドウが開いてしまうので元のウィンドウに移動
      chrome.tabs.move(restoredSession.tab.id, { windowId: currentWindow.id, index: -1 }, (movedTab) => {
        // 移動したタブをアクティブに
        chrome.tabs.highlight({ tabs: movedTab.index });

        // 移動したウィンドウをアクティブに
        chrome.windows.update(currentWindow.id, { focused: true });
      });
    });
  });
};

const restoreWindow = (id) => {
  chrome.sessions.restore(id);
};

// 最近閉じたタブの一覧が更新されたときはタブの一覧を再取得
chrome.sessions.onChanged.addListener(() => {
  location.reload();
});

// 最近閉じたタブの一覧を取得
chrome.sessions.getRecentlyClosed({}, (sessions) => {
  const $sessionList = $('#sessionList');
  
  for(session of sessions) {
    if(session.tab) {
      // タブの場合
      $(`
        <div class="sessionItem" data-session-type="tab" data-session-id="${session.tab.sessionId}">
          <dt><img src="${session.tab.favIconUrl}" alt="favicon" class="icon">${session.tab.title}</dt>
          <dd>${session.tab.url}</dd>
        </div>
      `).appendTo($sessionList);
    } else {
      // ウィンドウの場合
      var tabItems = '';
      for(tab of session.window.tabs) {
        tabItems += `
          <div class="tabItem" data-session-id="${tab.sessionId}">
            <dt><img src="${tab.favIconUrl}" alt="favicon" class="icon">${tab.title}</dt>
            <dd>${tab.url}</dd>
          </div>
        `;
      }

      $(`
        <div class="sessionItem" data-session-type="window" data-session-id="${session.window.sessionId}">
          <dt><img src="ic_tab_black_24px.svg" alt="window" class="icon" /> ${session.window.tabs.length} tabs</dt>
          <dd>
            <dl class="tabList">
              ${tabItems}
            </dl>
          </dd>
        </div>
      `).appendTo($sessionList);
    }
  }

  // アイコンを読み込めなければタブのアイコンに差し替え
  $('.icon').one("error", function() {
    this.src = 'ic_insert_drive_file_black_24px.svg';
  });

  // クリック時に復元
  $('.sessionItem').on('click', function() {
    const sessionId = this.dataset['sessionId'];

    if(this.dataset['sessionType'] === 'tab') {
      restoreTab(sessionId);
    } else {
      restoreWindow(sessionId);
    }
  });

  // タイトルやURLが収まりきらなかったときにツールチップを設定
  $('.sessionItem')
    .find('dd, dt')
    .each(function() {
      if(this.offsetWidth < this.scrollWidth){
        this.title = this.innerText;
      }
    });

  $('.tabItem')
    // hover時に.sessionItemに.tabItemHoverを追加
    .on('mouseenter', function() {
      $(this).closest('.sessionItem').addClass('tabItemHover');
    })
    .on('mouseleave', function() {
      $(this).closest('.sessionItem').removeClass('tabItemHover');
    })

    // ウィンドウの中のタブを復元
    .on('click', function(e) {
      restoreTab(this.dataset['sessionId']);

      // .sessionItemのクリックイベントを発動させない
      e.stopPropagation();
    });
});
