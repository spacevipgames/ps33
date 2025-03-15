/* eslint-disable semi */
import log from '../util/log.js'
import AJS from '../archive/archive.js'
import '../util/center.js' // for $.center()
import onclick from '../util/onclick.js'

// eslint-disable-next-line import/no-named-as-default
import $ from '../util/jquery.js'

/**
 * Handles management of items from GUI/browser.
 */
class Manage {
  /**
   * Includes the component's companion CSS
   */
  static css() {
    const el = document.createElement('style')
    el.textContent = `
#manage-ids {
  visibility: hidden;
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 1px;
}

#manage-help > div {
  display: inline-block;
  font-weight: bold;
  font-size: 125%;
  padding-right: 10px;
}

#manage-help .btn-info {
  background-color: #777;
  border-color: #666;
}


#manage-help > p {
  text-align: center;
}

.item-ia.manage-item  .item-img {
  opacity: .8;
}

.item-ia.manage-item  .item-img:hover {
  opacity: .9;
}

.manage-check {
  position: absolute;
  right: 0;
  top: 0;
  border-style: solid;
  border-color: black;
  border-width: 2px 4px;
  background-color: black;
  border-radius: 3px;
}

#confirm-remove-items .btn {
  display: block;
  margin: 0 auto 10px;
}

.task-pending {
  opacity: .20;
}

/* Bulk remove items modal */
#confirm-remove-items .modal-content {
  padding: 1rem;
}

#confirm-remove-items h2 {
  font-size: 2.4rem;
}
`

    const head = document.getElementsByTagName('head')[0]
    head.appendChild(el)
  }

  // Enum for possible page contexts
  static get Context() {
    return {
      Favorites: 'collection',
      SearchResults: 'search results',
      Uploads: 'uploads',
      Posts: 'posts',
      Reviews: 'reviews',
      Collections: 'collections',
      Loans: 'loans',
      WebArchives: 'web archives',
    }
  }

  /**
   * Append manager class and function on list/item tiles in pages:
   *   my favorites
   *   'My uploads'
   *   search results (admins only, if use manage=1 parameter)
   * @param {Boolean} extra - show extra options? (truthy/falsey OK)
   */
  static manage_items(extra) {
    // If in lists mode, convert to tiles
    if ($('body').hasClass('lists'))
      $('.tiles-button:visible').click()

    const context = $('body').hasClass('search-results-page') ? Manage.Context.SearchResults : AJS.inTab()

    // Prevent use of removal/darking feature on non-applicable pages
    // TODO: Better would be to not show the Remove Items button in the first place on these pages
    if (![
      Manage.Context.Favorites,
      Manage.Context.Uploads,
      Manage.Context.Collections,
      Manage.Context.WebArchives,
      Manage.Context.SearchResults,
    ].includes(context)) {
      // eslint-disable-next-line  no-alert
      alert('Removal feature cannot be used here')
      return
    }

    // Hide special tiles that can't be darked, removed, etc.
    const selectorsToHide = ['.item-ia.new-item']
    if (context === Manage.Context.Uploads || context === Manage.Context.Collections) {
      // Can't remove a user-favorites collection with same ID as current page
      // i.e. you can't remove your own user-favorites collection
      const userIdentifierMatch = window.location.pathname.match(/^\/details\/@([^&/#?]+)/)
      if (userIdentifierMatch) selectorsToHide.push(`.item-ia[data-id="fav-${userIdentifierMatch[1]}"]`)
    }
    $(selectorsToHide.join(', ')).toggleClass('hidden-tiles')

    $('.columns-facets').toggleClass('opac30')

    if (!$('.item-ia .manage-check').length) {
      if ($('#manage-help').length && !$('.item-ia .hov').length) {
        // cancel editability
        $('.item-ia').removeClass('manage-item').unbind('click')
        $('.columns-items .co-top-row > div').toggle()
        $('.item-ia .manage-check, #manage-help').remove()
        $('.item-ia').off('contextmenu')
        return
      }
      // make all items editable on page
      let selectionMessage;
      switch (context) {
      case Manage.Context.Favorites:
        selectionMessage = 'Select items to un-favorite'
        break
      case Manage.Context.SearchResults:
        selectionMessage = 'Select items'
        break
      default:
        selectionMessage = 'Select items to remove'
      }
      $('.columns-items .co-top-row').prepend(`
<div id="manage-help" style="display:none">
  <div>
    ${selectionMessage}
  </div>
  <div class="topinblock">
    <button id="manage-cancel" class="btn btn-small btn-info">
      Cancel
    </button>
    <button id="manage-remove" class="btn btn-small btn-danger">
      Remove selected items
    </button>
    ${(extra  &&  context === Manage.Context.SearchResults ? `
      <button id="manage-item-mgr" class="btn btn-small btn-warning">
        Item Manager the items
      </button>
      ` : '')}
  </div>
    ${(extra ? `
    <p class="topinblock">
      <a id="manage-toggle-all" href="#">
        Toggle</br>all
      </a>
    </p>
    ` : '')}
</div>`)

      $('#manage-cancel').bind('click', Manage.manage_items)
      $('#manage-remove').bind('click', () => Manage.remove_items_modal(context))
      $('#manage-item-mgr').bind('click', Manage.to_item_manager)
      $('#manage-toggle-all').bind('click', Manage.toggle_checkboxes)

      // visually swap the top row w/ new hidden 'item manager' top row above
      $('.columns-items .co-top-row > div').toggle()

      // show checkboxes in upper right of (manageable) tiles and make tile clicking _also_
      // react like you (un/)checked the checkbox
      $('.item-ia.task-pending').bind('click', Manage.tile_clicked)
      const $selectableTiles = $('.item-ia:not(.mobile-header):not(.new-item):not(.task-pending)')
      $selectableTiles
        .addClass('manage-item')
        .bind('click', Manage.tile_clicked)
        .append(Manage.checkbox(
          context === Manage.Context.SearchResults
            ? 'include item for item management'
            : 'remove this item from list',
        ))

      // esp. to make QA easier - make tile right-click open item /details/ page in new tab
      $('.item-ia').on('contextmenu', (e) => {
        // logically go 'down' or 'up' from the clickee to find first link (to item /details page)
        const link = ($(e.target).find('a:first').attr('href')  ||  $(e.target).parents('a').attr('href'))
        log('right-click', link)
        window.open(link, '_blank')
      })
    } else {
      // cancel editability
      $('.item-ia').removeClass('manage-item').unbind('click')
      $('.columns-items .co-top-row > div').toggle()
      $('.item-ia .manage-check, #manage-help').remove()
      $('.item-ia').off('contextmenu')
    }
  }


  /**
   * Removes the item for the item /details/ page user is visiting from their favorites list.
   * This is when request comes from "Favorite toggle button".
   * @param {HTMLElement} element
   */
  static remove_favorite_item(element) {
    const $item = $(element)
    const identifier = $item.data('id')
    const itemName = $item.data('fav-collection')

    if (!identifier || !itemName) return;

    const apiUrl = location.protocol.concat(
      '//',
      location.host,
      '/details/',
      itemName,
    ).concat(`?remove_item=${encodeURIComponent(identifier)}&kind=favorite`)

    // toggle favorite, un_favorite icon classes
    Manage.toggle_favorite_icon($item, false);

    // update favorite count on details page
    Manage.update_favorite_count(false);

    $.get(apiUrl);
  }


  /**
   * Renders a checkbox for an item tile
   * @param {string} title - what to display on hover
   */
  static checkbox(title) {
    return `
<div class="manage-check">
  <input
    type="checkbox"
    alt="${title}"
    title="${title}"/>
</div>`
  }


  /**
   * Treats any click on item tile like they hit the upper right checkbox
   * (when we're in 'manage' mode)
   *
   * @param {Object} evt
   */
  static tile_clicked(evt) {
    const $target = $(evt.target)

    if ($target.attr('type') === 'checkbox')
      return true // do default behaviour ;-)

    evt.stopPropagation()
    evt.preventDefault()

    // find the tile's checkbox and toggle it
    const checkbox = $target.parents('.item-ia').find('.manage-check input')
    checkbox.prop('checked', !checkbox.prop('checked'))

    return false
  }


  /**
   * Toggles any unchecked tile to checked (and vice-versa)
   */
  static toggle_checkboxes() {
    $('.manage-check input').prop('checked', (idx, val) => !val)
    return false
  }


  /**
   * Shows a modal to confirm 'remove all checked favorites/items?
   *
   * @param {string} context - are we removing favorites (or items)?
   */
  static remove_items_modal(context) {
    let body = ''
    // find all checked tiles and add each as a row to our modal confirm
    $('.item-ia[data-id]:has(:checked)').each((idx, e) => {
      const $e = $(e)
      const title = $e.find('.C2 a').text().trim()

      body += `
        <div>
          <div class="pull-right">
            ${$e.find('.pubdate > :first').text()}
          </div>
          <div>
            ${title.length ? title : '[untitled]'}
          </div>
          <hr/>
        </div>
      `
    })
    const title = (body === ''
      ? 'No items selected'
      : 'Are you sure you want to remove these items?'
    )

    let handler
    if (body === '') {
      body = `
        <div class="alert alert-danger">
          Please select some items using checkboxes from the prior screen to remove.
        </div>`
    } else {
      /* eslint-disable indent */
      switch (context) {
        case Manage.Context.Favorites:
          handler = 'confirmed_remove_favorites'
          break
        case Manage.Context.WebArchives:
          handler = 'confirmed_remove_web_archives'
          break
        default:
          handler = 'confirmed_dark_items'
      }
      /* eslint-enable indent */
      body += `
        <button class="btn btn-small btn-danger ${handler}">
          Remove items
        </button>`
    }

    AJS.modal_add(Manage.modalID, { title, body, headerClass: '' }).modal('show');

    // dark selected items
    onclick(`.${handler}`, () => {
      Manage[handler]()
    })
  }


  /**
   * Returns string CSV list of all (checked) identifiers in page
   */
  static checked_ids() {
    return $('.item-ia[data-id]:has(:checked)').toArray().reduce((a, b) => {
      const { id } = $(b).data()
      return a.concat((a ? ',' : ''), id)
    }, '')
  }


  /**
   * Returns JSON list of all (checked) identifiers in page
   */
  static checked_ids_json() {
    const ids = $('.item-ia[data-id]:has(:checked)').toArray().map((e) => $(e).data().id)
    return JSON.stringify(ids)
  }


  /**
   * Submits search results items to item manager for invoking operations on the list
   */
  static to_item_manager() {
    const ids = Manage.checked_ids()
    log('to_item_manager:', ids)

    if (ids !== '') {
      // now make a form that we can POST to, with all the identifiers,
      // and post to /manage/ page
      const $form = $(`
        <form id="manage-ids" method="POST" action="/manage/">
          <input type="text" name="identifier" value="${ids}"/>
        </form>`)
      $('body').append($form) // NOTE: firefox needs it in DOM to submit
      $form.submit()
    }

    return false
  }


  /**
   * User has confirmed the web archives should be removed.
   */
  static confirmed_remove_web_archives() {
    const data = {
      action: 'delete',
      identifiers: Manage.checked_ids_json(),
    }
    $.ajax({
      type: 'POST',
      url: '/services/web-archives/service.php',
      data,
      error: (jqXHR, textStatus, errorThrown) => {
        // eslint-disable-next-line  no-alert
        alert('Unable to complete the request. Our servers might be busy. Please try again later.')
        $(Manage.modalID).modal('hide')
      },
      success: Manage.update_tiles,
    })
  }


  /**
   * User has confirmed the items should be removed.  Homicide.
   */
  static confirmed_dark_items() {
    const data = {
      identifier: Manage.checked_ids(),
      admin: 'make_dark',
      'curation[state]': 'dark',
      'curation[comment]': `from ${location.pathname}`,
    }
    $.post('/manage/', data, Manage.update_tiles)
  }


  /**
   * Removes a list of identifiers from user's favorite list.
   * This is when user is looking at their /details/fav-... item.
   */
  static confirmed_remove_favorites() {
    const ids = Manage.checked_ids()

    const apiUrl = location.href.replace(/#.*$/, '').concat(`?kind=favorite&remove_item=${encodeURIComponent(ids)}`)

    $.get(apiUrl, Manage.update_tiles)

    return false
  }


  /**
   * Operation has been queued to system - now update results in page
   */
  static update_tiles() {
    $('.item-ia[data-id]:has(:checked)').remove()
    AJS.tiler()
    $(Manage.modalID).modal('hide')
  }


  /**
   * Adds marker to item tiles with a pending task
   *
   * @param {array} identifiers - list of identifiers w/ pending tasks
   */
  static decorate_pendings(identifiers) {
    if (!identifiers.length)
      return

    log('pending', identifiers)
    identifiers.forEach((id) => $(`.item-ia[data-id=${id}]`).addClass('task-pending'))
  }


  /**
   * Toggle favorite button on details page
   * @param {HTMLElement} element - Toggle button on /details/ page
   * @return {Boolean}
   */
  static toggle_list_status(element) {
    if ($(element).hasClass('favorited'))
      Manage.remove_favorite_item(element, true)  // Un-Favorite list or item
    else
      AJS.modal_go(element, { favorite: 1 })  // Favorite list or item

    return false
  }


  /**
   * Toggle favorite, No_Favorite iconochive classes
   *
   * @param {HTMLElement} $item
   * @param {Boolean} $addFavorite - true if you are favoriting item
   */
  static toggle_favorite_icon($item, addFavorite = true) {
    const $labelEl = $($item).find('span.icon-label')

    if ($item.length) {
      $item.find('span:eq(0)').toggleClass('iconochive-No_Favorite iconochive-favorite');

      if (addFavorite) {
        $item.addClass('favorited');
        $item.attr({
          'data-original-title': 'Unfavorite',
        });
        $labelEl.text('Unfavorite');
      } else {
        $item.removeClass('favorited');
        $item.attr({
          'data-original-title': 'Favorite',
        });
        $labelEl.text('Favorite');
      }
    }
  }

  /**
   * Update favorite count on details page
   *
   * @param {Boolean} increment - if true, increment by 1
   */
  static update_favorite_count(increment = true) {
    const $favoriteStatsElement = $('.favorite-count');
    let favoriteLabel = $favoriteStatsElement.find('.item-stats-summary__label');
    let favoriteCount = $favoriteStatsElement.find('.item-stats-summary__count');

    // create and append if favorites is not exist
    if (!favoriteCount.length) {
      favoriteCount = document.createElement('span');
      favoriteCount.className = 'item-stats-summary__count';
      $favoriteStatsElement.append(favoriteCount)

      favoriteLabel = document.createElement('span');
      favoriteLabel.className = 'item-stats-summary__label';
      $favoriteStatsElement.append(favoriteLabel)
    }

    // grab existing favorite count and convert into number
    let value = Number($(favoriteCount).text().trim().replace(/,/g, ''))
    if (increment)
      value += 1;
    else
      value -= 1;

    $(favoriteLabel).text(value === 1 ? ' Favorite' : ' Favorites');
    $(favoriteCount).text(value.toLocaleString());
  }
} // end class Manage


/**
 * Does setup once DOM and JS ready
 */
$(() => {
  // prevent to initialize for web.archive.org
  if (window.location.hostname === 'web.archive.org')
    return

  Manage.modalID = '#confirm-remove-items' // avoids static initializer until all browsers support
  Manage.css()

  if ($('body').hasClass('manage'))
    Manage.manage_items(1)

  const favoriteElement = $('.js-manage-toggle_list_status');
  if (favoriteElement.length) {
    favoriteElement.bind('click', (event) => {
      event.preventDefault();
      Manage.toggle_list_status(favoriteElement[0])
    });
  }

  onclick('.js-search-bar-manage', (e) => Manage.manage_items(1))

  // open share model on details page
  onclick('.js-manage-share_button', (e) => AJS.modal_go(e.currentTarget, { ignore_lnk: 1, shown: AJS.embed_codes_adjust }))
})

window.Manage = Manage // promote to global

export { Manage as default }
