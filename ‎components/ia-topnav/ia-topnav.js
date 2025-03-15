/* eslint-disable no-use-before-define, no-loop-func, no-console */
const medias = ['audio', 'images', 'software', 'texts', 'video', 'web', 'more'];

// NOTE: in DEVBOX mode, this is included as <script type="text/javascript" src=".."> and *not* as
//       an ESM module.  So no `import`-ing

const log = (
  location.hostname === 'localhost' ||
    location.host.substr(0, 4) === 'www-' ||
    location.host.substr(0, 4) === 'cat-' ||
    location.host.substr(0, 11) === 'ia-petabox-'
    // eslint-disable-next-line no-console
    ? console.log.bind(console) // convenient, no?  Stateless function
    : () => { }
);

/*
 * To avoid having to rewrite the athena.js, we create placeholder elements
 * to broadcast the events as we receive them.
 */
document.addEventListener('DOMContentLoaded', () => {
  const topnav = document.querySelector('ia-topnav');
  if (!topnav) { return; }

  const primaryNav = document.querySelector('ia-topnav primary-nav');
  const searchMenu = document.querySelector('ia-topnav search-menu .search-menu-inner');
  const navSearch = primaryNav.querySelector('nav-search');
  const mediaMenu = primaryNav.querySelector('media-menu');
  const mediaSlider = document.querySelector('ia-topnav media-slider');
  const userMenu = document.querySelector('ia-topnav user-menu'); // when logged in
  const userInfo = document.querySelector('ia-topnav .user-info'); // when logged out
  const signedOut = document.querySelector('signed-out-dropdown nav');
  const hamburgerMenu = mediaMenu.querySelector('.media-menu-container');
  const desktopSubnav = topnav.querySelector('desktop-subnav');

  // current menu e.g. mediamenu, usermenu, searchmenu etc...
  let menuOption = 'usermenu';

  // current menu focusable elements
  let focusableElements = [];
  let focusedIndex = 0;

  // keyDown handler for sub-nav and usermenu elements
  let mediaKeydownHandler = null;
  let userKeydownHandler = null;

  // should keep focus only when mediamenu, usermenu using close using Escape key
  let keepUserMenuFocused = false;
  let keepMediaMenuFocused = false;

  function localLog(msg) {
    log('<ia-topnav>:', msg);
  }

  function trackEvent({ event }) {
    if (!window.archive_analytics) return;
    const [category, action] = event.split('|');
    window.archive_analytics.send_event_no_sampling(
      category,
      action,
      window.location.pathname,
    );
  }

  function closerActive() {
    document.querySelector('#close-layer').classList.add('visible');
  }

  function closeSearchMobile() {
    navSearch.querySelector('.search-activated').classList.add('search-inactive');
    navSearch.querySelector('.search-activated').classList.remove('flex');
  }

  function closeSearch() {
    closeSearchMobile();
    searchMenu.classList.add('closed');
    searchMenu.setAttribute('aria-hidden', 'true');
  }

  function closeMedia(fully = true) {
    // remove any media selected indicators
    mediaMenu.querySelectorAll('media-button a.selected')
      .forEach((o) => {
        if (keepMediaMenuFocused) o.focus();
        o.classList.remove('selected');
      });

    mediaSlider.querySelectorAll('.open').forEach((o) => o.classList.remove('open'));
    if (fully) {
      hamburgerMenu.classList.remove('open');
      // eslint-disable-next-line no-use-before-define
      hamburgerMenuRemoveCloseX();
    }

    keepMediaMenuFocused = false;
    toggleMediaMenuVisibility('hidden');
  }

  function toggleMediaMenuVisibility(state = '') {
    const infoMenu = mediaSlider.querySelector('.information-menu');
    infoMenu.style.visibility = state;
  }

  function toggleUserMenuVisibility(state = '') {
    userMenu.querySelector('nav').setAttribute('aria-hidden', !!state);
    userMenu.style.visibility = state;
  }

  function closeUser() {
    // un-logged-in case first
    signedOut?.classList.add('initial');
    signedOut?.classList.remove('open');

    if (!userMenu) return;
    const e = userMenu.querySelector('nav');
    if (e.classList.contains('open')) {
      toggleUserMenuVisibility('hidden');
      if (keepUserMenuFocused) {
        userInfo.querySelector('button.user-menu').focus();
      } else {
        userInfo.querySelector('button.user-menu').blur();
      }
    }

    e.classList.add('initial');
    e.classList.remove('open');

    keepUserMenuFocused = false;
  }

  function openSearch() {
    closeMedia();
    closeUser();
    searchMenu.classList.remove('closed');
    searchMenu.setAttribute('aria-hidden', false);
    closerActive();
  }

  function openSearchMobile() {
    navSearch.querySelector('.search-activated').classList.remove('search-inactive');
    navSearch.querySelector('.search-activated').classList.add('flex');
    closerActive();
  }

  function openUser() {
    // un-logged-in case first
    signedOut?.classList.add('open');
    signedOut?.classList.remove('initial');

    if (!userMenu) return;
    const e = userMenu.querySelector('nav');
    e.classList.add('open');
    e.classList.remove('initial');
    e.setAttribute('aria-hidden', false);
    closerActive();

    userMenu.querySelectorAll('a').forEach((element) => element.setAttribute('tabindex', ''));
    toggleUserMenuVisibility();
  }

  function openMedia(media) {
    closeSearch();
    closeMedia(false);
    closeUser();
    toggleMediaMenuVisibility();

    mediaSlider.querySelectorAll('.closed').forEach((e) => e.classList.toggle('open'));
    mediaSlider.querySelectorAll('media-subnav').forEach((e) => e.classList.add('hidden'));
    mediaSlider.querySelector(`media-subnav[menu=${media}]`).classList.remove('hidden');
    closerActive();
  }


  function addHandlers() {
    localLog('adding tracking event listeners');

    topnav.addEventListener('trackClick', ({ detail }) => {
      trackEvent(detail);
      localLog(`Analytics click fired: ${detail.event}`);
    });

    topnav.addEventListener('trackSubmit', ({ detail }) => {
      trackEvent(detail);
      localLog(`Analytics submit fired: ${detail.event}`);
    });


    // In Safari, prevent loading from cache, which breaks WebComponents
    window.addEventListener('pageshow', (e) => {
      if (e.persisted) {
        window.location.reload();
      }
    });


    // clicking in [search] should show popup
    navSearch.querySelector('input[type=text]').addEventListener('focus', openSearch);
    searchMenu.querySelector('a.advanced-search').addEventListener('focus', openSearch);

    userInfo?.querySelector('a.dropdown-toggle')?.addEventListener('click', () => {
      if (signedOut.classList.contains('open')) {
        closeUser();
      } else {
        closeMedia();
        closeSearch();
        openUser();
        closerActive();
      }
    });

    userInfo?.querySelector('button.user-menu')?.addEventListener('click', async () => {
      menuOption = 'usermenu';
      focusableElements = await getFocusableElements(userMenu);
      console.log(focusableElements[1]);
      setTimeout(() => {
        focusableElements[1].focus();
      }, 100);
    });

    primaryNav.querySelector('.user-menu')?.addEventListener('click', () => {
      if (userMenu.querySelector('nav').classList.contains('open')) {
        closeUser();
      } else {
        closeMedia();
        closeSearch();
        openUser();
        closerActive();
      }
    });

    // clicking top mediatype (eg: texts) opens its panel
    for (const media of medias) {
      const mediaLink = mediaMenu.querySelector(`media-button[data-mediatype=${media}] a`);
      mediaLink.addEventListener('click', async (evt) => {
        const is_open = mediaLink.classList.contains('selected');
        if (is_open) {
          closeMedia(false);
        } else {
          openMedia(media);
          // indicate clicked media is now selected
          mediaLink.classList.add('selected');
          // if squish down to xs width, ensure hamburger menu is open (but not visibile) now, too
          hamburgerMenu.classList.add('open');
          // eslint-disable-next-line no-use-before-define
          hamburgerMenuAddCloseX();
        }

        // keyboard navigation
        menuOption = 'mediamenu';
        const activeMediaSubnav = mediaSlider.querySelector(`media-subnav[menu=${media}]:not(.hidden)`);
        focusableElements = await getFocusableElements(activeMediaSubnav);
        setTimeout(() => {
          focusableElements[0].focus();
        }, 100);

        // eslint-disable-next-line no-unused-expressions
        evt && evt.preventDefault && evt.preventDefault();
        // eslint-disable-next-line no-unused-expressions
        evt && evt.stopPropagation && evt.stopPropagation();
        return false;
      });
    }

    document.querySelector('#close-layer').addEventListener('click', () => {
      closeMedia();
      closeSearch();
      closeUser();
      document.querySelector('#close-layer').classList.remove('visible');
    });

    // mobile/xs width specific
    primaryNav.querySelector('button.hamburger').addEventListener('click', () => {
      closeSearch();
      closeUser();
      if (hamburgerMenu.classList.contains('open')) {
        closeMedia();
        // eslint-disable-next-line no-use-before-define
        hamburgerMenuRemoveCloseX();
      } else {
        hamburgerMenu.classList.add('open');
        closerActive();
        // eslint-disable-next-line no-use-before-define
        hamburgerMenuAddCloseX();
      }
    });

    primaryNav.querySelector('.search-trigger').addEventListener('click', () => {
      openSearchMobile();
      openSearch();
    });

    primaryNav.querySelector('a.upload').addEventListener('focus', () => closeSearch());
    desktopSubnav.querySelector('a.desktop-subnav').addEventListener('focus', () => closeSearch());
  }

  // Event handler function
  const handleKeyDownWrapper = (e) => {
    console.log('Keydown detected:', e.key);
    handleKeyDown(e);
  };

  async function getFocusableElements(container) {
    removeKeyDownListeners(container);

    const focusableTagSelectors = 'a, input, select, button';
    const elements = container.querySelectorAll(focusableTagSelectors);
    focusableElements = elements;
    focusedIndex = 0;

    // For 'mediamenu'
    if (menuOption === 'mediamenu') {
      if (!mediaKeydownHandler) {
        // Only bind if not already bound
        mediaKeydownHandler = handleKeyDownWrapper;
        container.addEventListener('keydown', mediaKeydownHandler);
      }
    }

    // For 'usermenu'
    if (menuOption === 'usermenu') {
      if (!userKeydownHandler) {
        // Only bind if not already bound
        userKeydownHandler = handleKeyDownWrapper;
        container.addEventListener('keydown', userKeydownHandler);
      }
    }

    // Return only focusable elements that are not disabled
    return Array.from(elements).filter((el) => !el.hasAttribute('disabled'));
  }

  // Call this function when switching mediatype sub-nav to remove listeners
  function removeKeyDownListeners(container) {
    if (mediaKeydownHandler) {
      container.removeEventListener('keydown', mediaKeydownHandler);
      mediaKeydownHandler = null;
    }
    if (userKeydownHandler) {
      container.removeEventListener('keydown', userKeydownHandler);
      userKeydownHandler = null;
    }
  }

  function handleKeyDown(event) {
    const { key } = event;
    const isArrowKey = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(key);

    if (isArrowKey) {
      handleArrowKey(key);
      event.preventDefault();
    } else if (key === 'Tab') {
      handleTabKey(event);
      event.preventDefault();
    } else if (key === 'Escape') {
      handleEsc(event);
      event.preventDefault();
    }
  }

  /**
   * Handles arrow key events and focuses the next or previous element.
   * @param {string} key - The key that was pressed
   * - ('ArrowDown', 'ArrowRight', 'ArrowUp', or 'ArrowLeft').
   */
  function handleArrowKey(key) {
    const isDownOrRight = ['ArrowDown', 'ArrowRight'].includes(key);
    if (isDownOrRight) {
      focusNext();
    } else {
      focusPrevious();
    }
  }

  /**
   * Focuses the previous focusable element in the container.
   */
  function focusPrevious() {
    if (focusableElements.length === 0) return;
    focusedIndex = (focusedIndex - 1 + focusableElements.length) % focusableElements.length;
    focusableElements[focusedIndex]?.focus();
  }

  /**
   * Focuses the next focusable element in the container.
   */
  function focusNext() {
    if (focusableElements.length === 0) return;
    focusedIndex = (focusedIndex + 1) % focusableElements.length;
    focusableElements[focusedIndex]?.focus();
  }

  /**
   * Handles the Tab key event and focuses the next or previous menu item.
   * @param {KeyboardEvent} event - The keyboard event object.
   */
  function handleTabKey(event) {
    const isShiftPressed = event.shiftKey;
    if (menuOption === 'usermenu' && userMenu.querySelector('.user-menu.open') !== null) {
      const focusElement = isShiftPressed
        ? mediaMenu.querySelector('media-button[data-mediatype=images] a')
        : document.querySelector('a.upload');

      if (focusElement) {
        focusElement.focus();
      }
    }

    if (menuOption === 'mediamenu') {
      focusableElements[focusedIndex]?.blur();

      const desktopMediaButtons = ['web', 'texts', 'video', 'audio', 'software', 'images'];

      let currentPosition = -1;
      desktopMediaButtons.forEach((index, position) => {
        const element = mediaMenu.querySelector(`media-button a.${index}.selected`);
        if (element) {
          currentPosition = position;
        }
      });

      // Get the next button's value and position
      const changedPosition = isShiftPressed ? currentPosition - 1 : currentPosition + 1;
      const nextIndex = desktopMediaButtons[(changedPosition) % desktopMediaButtons.length];
      if (isShiftPressed && currentPosition === 5) {
        mediaMenu.querySelector(`media-button a.${nextIndex}`)?.focus();
      } else if (currentPosition === 5) {
        if (document.querySelector('.user-menu')) {
          document.querySelector('.user-menu')?.focus();
        } else {
          userInfo.querySelectorAll('span a.login-button')[0]?.focus();
        }
      } else if (currentPosition !== -1) {
        mediaMenu.querySelector(`media-button a.${nextIndex}`)?.focus();
      }
    }

    event.preventDefault();
    event.stopPropagation();
  }

  function handleEsc(event) {
    if (event.key === 'Escape' || event.keyCode === 27) {
      keepUserMenuFocused = true;
      keepMediaMenuFocused = true;

      closeSearch();
      closeMedia(true, true);
      closeUser();
    }
  }

  function navTweaks() {
    const tweaks = JSON.parse(document.querySelector('.js_nav_tweaks')?.value ?? false);
    if (!tweaks) return;

    if (tweaks.hideSearch) {
      primaryNav.querySelector('nav-search').classList.add('hidden');
      primaryNav.querySelector('button.search-trigger').classList.add('hidden');
    }

    if (tweaks.uploadURL)
      primaryNav.querySelector('a.upload')?.setAttribute('href', tweaks.uploadURL);
  }


  function addUserMenuLinks(links) {
    const ul = userMenu.querySelector('ul');

    let li = document.createElement('li');
    li.role = 'presentation';
    li.classList = 'style-scope user-menu divider';
    ul.append(li);

    while (links.length) {
      const link = links.shift();
      li = document.createElement('li');
      li.classList = 'style-scope user-menu';
      li.innerHTML = link.url
        ? `<a href="${link.url}" class="style-scope user-menu"
            data-event-click-tracking="TopNav|${link.analyticsEvent}">${link.title}</a>`
        : `<span class="style-scope user-menu info-item">${link.title}</span`;
      ul.append(li);
    }
  }

  function userMenuLinks() {
    const conf = JSON.parse(document.querySelector('.js_user_menu_links')?.value ?? false);
    if (!conf)
      return;

    const { identifier, uploader, biblio } = conf;

    addUserMenuLinks([{
      title: 'ADMINS:',
    }, {
      title: 'item:',
    }, {
      url: `/editxml/${identifier}`,
      title: 'edit xml',
      analyticsEvent: 'AdminUserEditXML',
    }, {
      url: `/edit.php?redir=1&identifier=${identifier}`,
      title: 'edit files',
      analyticsEvent: 'AdminUserEditFiles',
    }, {
      url: `/download/${identifier}/`,
      title: 'download',
      analyticsEvent: 'AdminUserDownload',
    }, {
      url: `/metadata/${identifier}/`,
      title: 'metadata',
      analyticsEvent: 'AdminUserMetadata',
    }, {
      url: `https://catalogd.archive.org/history/${identifier}`,
      title: 'history',
      analyticsEvent: 'AdminUserHistory',
    }, {
      url: `/manage/${identifier}`,
      title: 'manage',
      analyticsEvent: 'AdminUserManager',
    }, {
      url: `/manage/${identifier}#make_dark`,
      title: 'curate',
      analyticsEvent: 'AdminUserCurate',
    }, {
      url: `/manage/${identifier}#modify_xml`,
      title: 'modify xml',
      analyticsEvent: 'AdminUserModifyXML',
    }, {
      url: `/services/flags/admin.php?identifier=${identifier}`,
      title: 'manage flags',
      analyticsEvent: 'AdminUserManageFlags',
    }]);


    if (biblio) {
      addUserMenuLinks([{
        url: `${biblio}&ignored=${identifier}`,
        title: 'biblio',
        analyticsEvent: 'AdminUserBiblio',
      }, {
        url: `/bookview.php?mode=debug&identifier=${identifier}`,
        title: 'bookview',
        analyticsEvent: 'AdminUserBookView',
      }, {
        url: `/download/${identifier}/format=Single Page Processed JP2 ZIP`,
        title: 'jp2 zip',
        analyticsEvent: 'AdminUserJP2Zip',
      }]);
    }

    if (uploader) {
      addUserMenuLinks([{
        title: 'uploader:',
      }, {
        title: uploader,
      }, {
        url: `https://catalogd.archive.org/control/useradmin.php?email=${uploader}`,
        title: 'user admin',
        analyticsEvent: 'AdminUserUserAdmin',
      }, {
        url: `https://catalogd.archive.org/control/setadmin.php?user=${uploader}&ignore=${identifier}`,
        title: 'user privs',
        analyticsEvent: 'AdminUserUserPrivs',
      }]);
    }
  }

  const HAMBURGER_OPEN_SELECTOR = 'icon-hamburger svg:nth-child(1)';
  const HAMBURGER_CLOSE_SELECTOR = 'icon-hamburger-x';

  function hamburgerMenuAddCloseX() {
    try {
      const hamburger = document.getElementsByTagName('icon-hamburger')[0];
      if (!document.getElementById(HAMBURGER_CLOSE_SELECTOR)) {
        document.querySelector(HAMBURGER_OPEN_SELECTOR).style.display = 'none';

        // eslint-disable-next-line prefer-template
        hamburger.innerHTML = hamburger.innerHTML +
          '<svg id="' + HAMBURGER_CLOSE_SELECTOR + '" viewBox="0 0 40 40" version="1.1" xmlns="http://www.w3.org/2000/svg" aria-labelledby="closeTitleID closeDescID" style="fill:white;width:4rem;height:4rem;">' +
          '<title id="closeTitleID">Close icon</title>' +
          '<desc id="closeDescID">A line drawing of an X</desc>' +
          '<path d="m29.1923882 10.8076118c.5857864.5857865.5857864 1.535534 0 2.1213204l-7.0711162 7.0703398 7.0711162 7.0717958c.5857864.5857864.5857864 1.5355339 0 2.1213204-.5857865.5857864-1.535534.5857864-2.1213204 0l-7.0717958-7.0711162-7.0703398 7.0711162c-.5857864.5857864-1.5355339.5857864-2.1213204 0-.5857864-.5857865-.5857864-1.535534 0-2.1213204l7.0706602-7.0717958-7.0706602-7.0703398c-.5857864-.5857864-.5857864-1.5355339 0-2.1213204.5857865-.5857864 1.535534-.5857864 2.1213204 0l7.0703398 7.0706602 7.0717958-7.0706602c.5857864-.5857864 1.5355339-.5857864 2.1213204 0z" class="fill-color" fill-rule="evenodd"></path>' +
          '</svg>';
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error({ error });
    }
  }

  function hamburgerMenuRemoveCloseX() {
    try {
      document.querySelector(HAMBURGER_OPEN_SELECTOR).style.display = '';
      document.getElementById(HAMBURGER_CLOSE_SELECTOR)?.remove();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error({ error });
    }
  }

  // uncomment (suggested) to make dev/debugging *a lot* easier with methods avail in dev tools
  /*
  window.x = {
    openMedia,
    openSearch,
    openUser,
    closeMedia,
    closeSearch,
    closeUser,
    primaryNav,
    searchMenu,
    navSearch,
    mediaMenu,
    mediaSlider,
    userMenu,
    userInfo,
    signedOut,
    hamburgerMenu,
  };
  */

  addHandlers();
  userMenuLinks();
  navTweaks();

  log('IA topnav has loaded.');
});
