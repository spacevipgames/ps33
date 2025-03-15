/* eslint-disable semi */

import Cookies from 'https://esm.archive.org/js-cookie'

// eslint-disable-next-line import/no-named-as-default
import $ from '../util/jquery.js'
import '../util/center.js' // for $.center()
import '../util/popup.js'
import '../related/related.js'
import '../setUpCopyableTexts/setUpCopyableTexts.js'
import '../disabilityEligibility/disabilityEligibility.js';
import paramsToJSON from '../paramsToJSON/paramsToJSON.js'

import Manage from '../manage/manage.js'
import Banners from '../nav/banners.js'
import log from '../util/log.js'
import cgiarg from '../util/cgiarg.js'
import add_commas from '../util/add_commas.js'
import ios from '../util/ios.js'
import loginModal from '../login/loginModal.js'
import Geo from '../geo/geo.js'
import SearchAutocomplete from '../search/autocomplete.js'
import '../search/collection-search-submit.js'
import onclick from '../util/onclick.js'
import onchange from '../util/onchange.js'
import onsubmit from '../util/onsubmit.js'
import { debounce } from '../util/debounce.js'

/* Donation Banner */
import '../donation-banner/donation-banner.js';

/* global  archive_analytics */


// class mnemonic: Archive JS
class AJS {
  static paramsToJSON() {
    return paramsToJSON()
  }

  static isTouchDevice() {
    return ('ontouchstart' in window ||
            (window.DocumentTouch && document instanceof window.DocumentTouch))
  }

  static theatre_controls_position($selectorIn, pegTop, widthIn, heightIn) {
    // We have lots of callers!  video, software, texts.
    // So sort out our args and where we gonna "peg"/glue things to...
    let $selector = $selectorIn
    const video = (heightIn  &&  !$selectorIn)
    if (!video) {
      if (!$selectorIn) $selector = $('#canvas') // software emulation
      if (!$selector.length) return // protect against emulated embeds and undef...
    }

    const height = (video ? heightIn : ($selector.height() || 0))
    const width  = (video ? widthIn  : ($selector.width() || 0))

    if (!video  &&  typeof pegTop !== 'undefined')
      $('#theatre-controls').offset({ top: pegTop })


    // Subtract out the width of the controls to get total amount of black pixels
    // to the right of the theatre object.
    // We want to position the controls in the middle of the dark pixels / right gutter!
    const right_gutter_width =
      Math.round(($('#theatre-ia-wrap').width() - $('#theatre-controls').width() - width) / 2)

    log('width', width)
    log('right_gutter_width', right_gutter_width)


    $('#theatre-controls').css({
      height,
      visibility: 'visible',
      right: Math.max(20, right_gutter_width / 2),
    })
  }


  /**
   * A general purpose theatre sizing function.
   * It keeps the metadata below the theatre partially visible.
   * @param {function} onChange - called when size changes
   * @global AJS.theatresize_maxheight if this is set by another
   *   part of the code, it will contrain to this max height.
   */
  static theatresize(onChange) {
    if (!AJS.theatresize_maxheight)
      AJS.theatresize_maxheight = null
    const resizer = () => {
      const metadataHeight = 100 // metadata peekaboo min height!
      const maximumHeight = 1000 // don't get larger than this
      const minHeight = Math.min($(window).width(), 400)
      let targetHeight = $(window).height() - ($('#navwrap1').height() || 0) - metadataHeight

      if (AJS.theatresize_maxheight)
        targetHeight = Math.min(targetHeight, AJS.theatresize_maxheight)

      targetHeight = Math.max(targetHeight, minHeight)
      const height = Math.min(targetHeight, maximumHeight)
      $('#theatre-ia-wrap').addClass('resized').css('height', height)

      if (onChange)
        onChange($('#theatre-ia-wrap').height() || 0)
    }
    resizer() // page load event is now
    $(window).on('resize  orientationchange', () => {
      clearTimeout(AJS.theatresize_throttler)
      AJS.theatresize_throttler = setTimeout(resizer, 250)
    })
  }

  /**
   * Will reduce the vertical size of the carousel once all the images have
   * downloaded and only if they are all smaller than the current size.
   * This is a progressive enhancement
   * @param string selector
   * @param bool enableThreatreChange
   */
  static carouselsize(selector, enableThreatreChange) {
    const $carousel = $(selector)
    const imagePromises = $carousel.find('img.carousel-image').map((i, img) => {
      const promise = $.Deferred()
      let result
      if (img.complete) {
        result = promise.resolve(img.naturalHeight).promise()
      } else {
        img.addEventListener('load', () => {
          promise.resolve(img.naturalHeight)
        })
        result = promise
      }
      return result
    }).get()
    $.when(...imagePromises).then((...args) => {
      const currHeight = $carousel.height()
      const maxImageHeight = Math.max(...args)
      if (currHeight > maxImageHeight) {
        $carousel.css('maxHeight', maxImageHeight)
        if (enableThreatreChange) {
          AJS.theatresize_maxheight = maxImageHeight
          $(window).trigger('resize')
        }
      }
    })
  }


  static popover_menu(selector, opts) {
    // setup options
    const options = {
      trigger: 'hover focus click', // make accessible
      container: selector,
      content: opts.content,
      html: true,
    }
    // do not overwrite values given by the 'data-' attribute
    if (opts.title)
      options.title = opts.title
    if (opts.placement)
      options.placement = opts.placement
    if (opts.trigger)
      options.trigger = opts.trigger

    // setup popover
    $(selector).popover(options)
  }


  // makes the tooltip show for picking dates
  static date_switcher(htm) {
    const selector = '#date_switcher'

    // make a tooltip trigger manually, on hover, but then *hold it showing*
    // until they leave area *including* tooltip itself
    $(selector).tooltip({
      html: true,
      trigger: 'manual', // we gonna control hover behaviour
      placement: 'bottom',
      title: htm,
    }).on('mouseenter focusin', function date_switcher_hover() {
      // check first if already showing, to avoid "flickering" with "show! .. show!"
      if (!($(selector).parent().find('.tooltip').length))
        $(this).tooltip('show')
    })


    // the date_switcher lives inside bigger "sortbar".  the date changing tooltip
    // lives inside it (and hangs off it).  So what we *really* want as the trigger
    // to hide the date change tooltip is the entire sortbar itself.  nice!
    $('.sortbar').on('mouseleave', () => {
      log('not hovering sortbar anymore')
      $(selector).tooltip('hide')
    })


    $(selector).on('shown.bs.tooltip', () => {
      // make any link hit change which one is "in"
      // (just before page starts to reload)  finesse!
      $(selector).parent().find('.date_switcher').on('click', function date_switcher_click() {
        $(this).parents('.tooltip').find('.date_switcher.in').removeClass('in')
        $(this).addClass('in')
      })
    })
  }


  // We moved to newer tactic Mar2015...
  // Pages are emitted by default with body classes "lists" and "showdetails".
  // We use JS to toggle/remove them and switch off details or switch to "tiles" mode.
  static lists_v_tiles_setup(cookie_range) {
    // does user have any cookied preferences?
    const defaults    = 'tiles' // (cookie_range === 'search' ? 'lists' : 'tiles')
    const prefer      = Cookies.get(`view-${cookie_range}`)
    const showdetails = Cookies.get(`showdetails-${cookie_range}`)

    const checked = (showdetails === 'showdetails'  ||
      (showdetails === undefined  &&  defaults === 'lists'))

    if (prefer === 'lists'  ||  (!prefer  &&  defaults === 'lists')) {
      if (checked)
        return // perfect, we are already what they want
      $('body').removeClass('showdetails') // they dont want full details right now
    } else {
      // switch to "tiles" mode
      $('body').removeClass('lists'.concat(checked ? '' : ' showdetails')).addClass('tiles')
    }
  }


  static showdetails_toggle(cookie_range) {
    const $body = $('body')

    const to = ($body.hasClass('showdetails') ? '' : 'showdetails')
    log('showdetails_toggle() going to: ', to)

    Cookies.set(`showdetails-${cookie_range}`, to, { path: '/', expires: 30, domain: '.archive.org' })

    $body.toggleClass('showdetails')
  }


  static tiles_toggle(btn, cookie_range) {
    const $body = $('body')

    const to = ($body.hasClass('tiles') ? 'lists' : 'tiles')
    log('tiles_toggle() going to', to)

    $body.removeClass('lists tiles').addClass(to)
    AJS.tiler()

    Cookies.set(`view-${cookie_range}`, to, { path: '/', expires: 30, domain: '.archive.org' })

    return false
  }


  /**
   * Returns which tab page appears to be in
   * @returns {String}
   */
  static inTab() {
    const currentTab = $('.welcome .tabby.in .tabby-text')
      .first()
      .text()
      .toLowerCase()
      .trim()

    if (currentTab.indexOf('forum') === 0) {
      return currentTab
        .split(' ') // "FORUM (3,254)"" breaks otherwise
        .shift()
    }

    return currentTab;
  }


  // Returns one of these, like "#ikind-[IKIND]"
  //
  // COLLECTION PAGES, ACCOUNT PAGES:
  //
  //   #ikind--downloads
  //   #ikind--titleSorter
  //   #ikind--publicdate
  //   #ikind--date
  //   #ikind--reviewdate
  //   #ikind--updatedate
  //   #ikind--creatorSorter
  //
  //   #ikind-downloads
  //   #ikind-titleSorter
  //   #ikind-publicdate
  //   #ikind-date
  //   #ikind-reviewdate
  //   #ikind-updatedate
  //   #ikind-creatorSorter
  //
  // ACCOUNT PAGES (additionally):
  //
  //   #ikind-loans-waiting-list
  //   #ikind-loans-on-loan
  //   #ikind-loans-history
  //
  // OTHER:
  //
  //   #ikind-search              (search)
  //
  static selector() {
    const inTab = AJS.inTab()
    if (inTab === 'forum'  ||  inTab === 'posts'  ||  inTab === 'about')
      return false // no tab of tiles are showing

    let selector = false
    if (inTab) {
      // We want to end up with a selector like:
      //    #ikind-collections-title
      //    #ikind--publicdate
      log('inTab', inTab)
      const tmp = `#tabby-${inTab.replace(' ', '-')}`
      if (inTab === 'collection'  ||  inTab === 'collections'  ||  inTab === 'uploads' || inTab === 'reviews' || inTab === 'web archives') {
        selector = '#'.concat($(tmp.concat(' div.ikind.in:first')).attr('id'))
      } else {
        const ikind = $(tmp.concat(' .ikind.stealth.in:first')).text().toLowerCase().replace(/ /, '-')
        selector = `#ikind-${inTab}${ikind === '' ? '' : '-'}${ikind}`
      }
    } else {
      // we want to end up with a selector like:
      //    #ikind-date
      selector = '#ikind-'.concat($('.ikind.stealth.in:first').text().toLowerCase().replace(/ /, '-'))
      if (!$(selector).length) selector = '#ikind-search' // xxx  SHORE THIS UP, GIRL!
    }

    log('SELECTOR', selector)

    return selector
  }


  // adds collection parent hovering image and text to tiles
  static parent_hover($selector) {
    $selector.find('.item-ia:not(.hov):not(.collection-ia):not(.account-ia)').addClass('hov')
      .mouseover(((e) => $(e.currentTarget).find('.item-parent').addClass('hoverin')))
      .mouseout(((e)  => $(e.currentTarget).find('.item-parent').removeClass('hoverin')))
  }


  static tiler(selectorIn, noRecall) {
    if (!$('body').hasClass('tiles')) {
      if ($('body').hasClass('showdetails'))
        $('.sortbar input[name=showdetails]').prop('checked', true)
    }

    const selector = (selectorIn  ||  AJS.selector())
    if (selector === false)
      return

    const $selector = $(selector).first()

    AJS.parent_hovered = AJS.parent_hovered || {}
    if (!AJS.parent_hovered[selector]) {
      AJS.parent_hover($selector)
      AJS.parent_hovered[selector] = true
    }
  }


  static ikind(lnk, id) {
    const idsel = `#${id}`
    log('ikind', id)
    $(idsel).parent().find('div.ikind.in').hide()
    $(idsel).removeClass('hidden').addClass('in').show()
    $(idsel).parents('.tabby-data').find('a.ikind').removeClass('in')

    $(lnk).addClass('in')

    AJS.tiler(idsel)

    // now select the corresponding element in the shadowing select for mobile
    const $sel = $(idsel).parents('.tabby-data').find('select.ikind-mobile')
    const $new = $sel.find('option:contains('.concat($(lnk).text(), ')'))
    const $now = $sel.find('option:selected')
    if ($new.text().trim() !== $now.text().trim()) {
      log('changing ikind mobile now to ', $new.text())
      AJS.ikind_mobile_change_ignore_next = true
      $new.attr('selected', 'selected')
      // $now.removeAttr('selected')
    }

    return false
  }

  static ikind_mobile_change(elm) {
    if (AJS.ikind_mobile_change_ignore_next) {
      AJS.ikind_mobile_change_ignore_next = false
      return
    }

    const $selopt = $(elm).find('option:selected')
    log('ikind mobile changed to: ', $selopt.text())
    let $ikinds = $(elm).parents('.tabby-data').find('a.ikind')
    if (!$ikinds.length) {
      // NO tabby!  eg: top page or search page
      $ikinds = $('body').find('a.ikind')
    }

    if (!$ikinds.length)
      return // uho!

    const $ikind = $ikinds.filter((k, v) => $(v).text() === $selopt.text())

    const href = $ikind.attr('href')
    log('goto', href)

    if (href) {
      if (href.substr(0, 1) === '#') {
        // ACCOUNT PAGE (FOR NOW)!  (STILL USES HASH FOR NOW)
        $(`a.ikind[data-id=${href.substr(1)}]`).click()
      } else {
        location.href = href
      }
    }
  }


  static popState(pageType) {
    // are we watching history.pushState() and history.popState() calls?
    AJS.pushState = (typeof history.pushState !== 'undefined')
    log('popState(', pageType, ') called, modern browser: ', (AJS.pushState ? 'y' : 'n'))

    if (pageType) // anything custom we need to do based on pageType?
      return


    const tabPick = (hash2arg) => {
      let tab = cgiarg('tab', true)
      if (tab)
        tab = `#tabby-${tab}-finder`
      else if (hash2arg)
        tab = `#tabby-${hash2arg}-finder`
      else
        tab = '.tabby-default-finder'

      if (AJS.pushState)
        log('goto tab: ', tab, ' ################################################### STATE')
      AJS.tabby_no_pushState_next_click = true
      $(tab).click()
    }

    if (AJS.pushState) {
      // runs on page load or browser "back":
      $(window).on('popstate', () => tabPick())
    }
    // else user has an older browser or Opera Mini and doesn't have pushState/popState!

    tabPick()
  }


  static tabby(lnk, id) {
    log('AJS.tabby()', id)
    const inTab = id.replace(/tabby-/, '').trim()
    if (inTab === 'uploads' || inTab === 'reviews' || inTab === 'collections' || inTab === 'loans' || inTab === 'web archives') {
      // account pages -- we need to fully reload page w/ new/wanted item tiles!
      return
    }

    // Only collection pages have tabs / proceed
    // All three tabs have all the markup on the page already.
    // So, for modern browsers, we will simply switch the visibile
    // tab and update-in-place the url in the browser url typein
    // -- WITHOUT refreshing the page.

    $('.tabby-data.in').removeClass('in').hide()
    $(`#${id}`).removeClass('hidden').addClass('in').show()
    $('.tabby').removeClass('in')
    $(lnk).parents('.tabby').addClass('in')

    if (AJS.tabby_no_pushState_next_click) {
      delete AJS.tabby_no_pushState_next_click
    } else if (AJS.pushState  &&  typeof history.pushState !== 'undefined') {
      const href = $(lnk).attr('href')
      const locNOW = location.href
      const locNEW = location.protocol.concat('//', location.host, href)
      if (locNOW !== locNEW) {
        log('pushState: ', href, ' ################################################### STATE')
        history.pushState({}, '', locNEW)
      }
    }

    if (inTab === 'collection'  ||  inTab === 'about') {  // collection pages
      if (inTab === 'about')
        AJS.grafs()
      AJS.tiler()
    }

    // eslint-disable-next-line no-unused-expressions
    if (AJS.pushState) event?.preventDefault()
  }

  /**
   * Handler for when user clicks/taps on More link under Collection Header.
   * Switches to About tab.
   */
  static collectionSummaryMoreClicked() {
    // Switch to the About tab
    return AJS.tabby('#tabby-about-finder', 'tabby-about');
  }

  static head_img_dragdrop_setup(identifier) {
    if (AJS.head_img_dragdrop_setup_done)
      return
    log('head_img_dragdrop_setup')
    AJS.head_img_dragdrop_setup_done = true


    $('#file-dropper-wrap').bind('mouseenter', () => {
      log('enter')
      AJS.head_img_replaceable(identifier)
      $('#file-dropper').show()
    }).bind('mouseleave', () => {
      log('ouddie')
      if (!AJS.file_picked)
        $('#file-dropper').hide()
    })

    $('body').bind('dragover', (evt) => {
      // enable file dropping
      log('dragover')
      evt.stopPropagation()
      evt.preventDefault()

      AJS.head_img_replaceable(identifier)
      $('#file-dropper').addClass('drag_over').show()
      return false
    })

    $('body').bind('dragleave', (evt) => {
      log('dragleave')

      // are we still over a file-dropper div/img?
      let over = ($('#file-dropper-wrap').is(':hover') ||
                  $('#file-dropper     ').is(':hover') ||
                  $('#file-dropper-img ').is(':hover'))
      const x = evt.pageX || evt.originalEvent.pageX
      const y = evt.pageY || evt.originalEvent.pageY
      if (!over) {
        const e = $('#file-dropper-wrap')
        const { left, top } = e.offset()
        if (x >= left  &&  x <= left + e.outerWidth()  &&
            y >= top   &&  y <= top  + e.outerHeight()) {
          // still over the file drop target image area!
          over = true
        }
      }
      if (!over) {
        const e = $('#file-dropper')
        const { left, top } = e.offset()
        if (x >= left  &&  x <= left + e.outerWidth()  &&
            y >= top   &&  y <= top  + e.outerHeight()) {
          // still over the file drop target image area!
          over = true
        }
      }

      if (!over)
        $('#file-dropper').removeClass('drag_over').hide()
    })
  }

  static head_img_replaceable(identifier) {
    // helpfuls:
    //  https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest
    //  http://www.sitepoint.com/html5-ajax-file-upload/
    if ($('#file-dropper').html().trim() !== '')
      return

    $('#file-dropper').show().html(`
<div>
<button id="file-cancel" type="button" class="close" data-dismiss="alert" aria-hidden="true"
        title="cancel file upload" alt="cancel file upload">
  &times;
</button>
<b>
  <span style="font-size:40px; color:#aaa" class="iconochive-plus-circle" />
</b><br/>
<b>
  Drag & Drop an image file here or
</b>
<button id="file-picker" type="button" class="btn btn-info btn-xs">
  Pick image to upload
</button>
<form method="POST" action="/services/post-file.php?submit=1&identifier=${identifier}"
      enctype="multipart/form-data" id="poster">
  <div class="hidden">
    <input id="file-selector" name="file" type="file" accept="image/*"/>
  </div>
  <input type="hidden" name="identifier" value="${identifier}"/>
  <input id="file-submit" type="submit" name="submit" value="SUBMIT" class="btn btn-success"/>
  <div id="file-uploading">
    Uploading your file..
  </div>
</form>
</div>`)

    onclick('#file-picker', () => $('#file-selector').click())

    $('#file-cancel').bind('click', (evt) => {
      AJS.cancelFile()

      evt.stopPropagation()
      evt.preventDefault()
      return false
    })


    const success = () => {
      log('success!')
      // AJS.cancelFile()
    }


    // upload an image (typically a collection/list header or account/person profile)  via S3
    // returns '' on success; else string w/ error/fail reason
    const uploadFile = () => {
      let fail = false

      if (typeof XMLHttpRequest === 'undefined')
        fail = 'browser appears to not have HTML5 functionality'

      if (!fail)
        fail = AJS.badFile()


      const xhr = new XMLHttpRequest()
      if (!fail) {
        log(AJS.file2post)
        if (!xhr.upload)
          fail = 'browser submit setup failed'
      }

      if (fail)
        return fail


      // start upload
      log('post')
      const now = Math.round(Date.now() / 1000) // like unix time()
      xhr.open(
        'POST',
        location.protocol.concat(
          '//', location.host,
          '/services/post-file.php?submit=1&identifier=', identifier,
          '&fname=', encodeURIComponent(AJS.file2post.name),
        ),
      )
      xhr.setRequestHeader('Content-Type', 'multipart/form-data; charset=UTF-8')
      xhr.send(AJS.file2post)
      log('posted in background')


      $('#file-dropper').html('waiting for your tasks to queue')
      let stalker_ptr = false
      const stalker = () => {
        log('STALKING...')
        $.getJSON(
          `/metadata/${identifier}?rand=${Math.random()}`,
          (json) => {
            const num_wait = (json.pending_tasks && json.tasks ? json.tasks.length : 0)
            if (!num_wait) {
              log('last update', json.item_last_updated, 'vs now', now)
              if (json.item_last_updated < now) {
                $('#file-dropper').html('waiting for your tasks to queue')
              } else {
                log('task(s) done!')
                clearInterval(stalker_ptr)
                $('#file-dropper').html('reloading page with your image')
                window.location.reload()
              }
            } else {
              const errored = json.tasks.filter((e) => e.wait_admin === 2).length
              if (errored) {
                $('#file-dropper').html(`
                  <div class="alert alert-danger">
                    status task failure -- an admin will need to resolve
                  </div>`)
                clearInterval(stalker_ptr)
              } else {
                $('#file-dropper').html(`waiting for your ${num_wait} tasks to finish`)
              }
            }
          },
        )
      }

      // every 2 seconds, check for status
      stalker_ptr = setInterval(stalker, 2000)

      return ''
    }


    $('#file-selector').bind('click', () => {
      AJS.file_picked = 'selected'
    }).bind('change', (evt) => {
      log('file dropdown selected!')
      $('#file-submit, #file-cancel').show()
      log(evt)
      if (evt.target  &&  evt.target.files  &&  evt.target.files.length) {
        [AJS.file2post] = evt.target.files
        AJS.previewFile()
      }
    })


    $('#file-dropper').bind('drop', (evt) => {
      // we've been dropped a file (from a drag-and-drop)!
      evt.stopPropagation()
      evt.preventDefault()

      $('#file-dropper').removeClass('drag_over')

      $('#file-submit, #file-cancel').show()


      if (evt.originalEvent?.dataTransfer?.files) {
        log(evt.originalEvent.dataTransfer.files)
        AJS.file_picked = 'dropped';
        [AJS.file2post] = evt.originalEvent.dataTransfer.files
        AJS.previewFile()
        // dropping an image isn't set in <input type="file" /> field
        // do need to set file manually, WEBDEV-3837
        $('#file-selector').files = evt.originalEvent.dataTransfer.files
      }
    })


    $('#poster').bind('focusin', (evt) => {
      log(evt.type)
      $('#file-uploading').show()
    }).bind('submit', (evt) => {
      log('submit!')
      $('#file-uploading').show()

      // First try the schmancy HTML5 submit via XMLHttpRequest and FileReader.
      // If we fail, we'll fallback to form submit normal action.
      const fail = uploadFile()
      if (fail === '') {
        // SUCCESS!  we are done!
        success()
        evt.stopPropagation()
        evt.preventDefault()
        return false
      }

      if (AJS.file_picked === 'dropped') {
        // we had client drag-n-drop the file -- we can't post it!
        // epic fail...
        AJS.cancelFile()
        // eslint-disable-next-line  no-alert
        alert(`Failure: ${fail}`)
        evt.stopPropagation()
        evt.preventDefault()
        return false
      }

      // OK fallback to normal (selected) file submit (and full page reload)!
      return true
    })


    // now center file-dropper over current image
    const w1 = $('#file-dropper-img').outerWidth()
    const h1 = $('#file-dropper-img').outerHeight()
    const w2 = $('#file-dropper').outerWidth()
    const h2 = $('#file-dropper').outerHeight()
    $('#file-dropper').css({
      left: Math.round((w1 - w2) / 2),
      top:  Math.round((h1 - h2) / 2),
    })

    if (ios) {
      $('#file-dropper > form > div.hidden').removeClass('hidden')
      $('#file-dropper > button').addClass('hidden')
    }
  }


  // client-side preview the image directly in the browser!  xxx catch exceptions, etc.
  static previewFile() {
    $('#file-dropper .uppreview').remove() // remove any prior upload/preview

    if (AJS.badFile()) {
      AJS.cancelFile()
      return false
    }

    if (typeof FileReader === 'undefined')
      return false

    const reader = new FileReader()
    reader.onload = (evt) => {
      log(evt.target)
      const im = new Image()
      im.src = evt.target.result
      $('#file-dropper').append(im)
      $(im).addClass('uppreview')
      // $('#file-dropper').css(
      //      {'background':'url(' + evt.target.result + ') no-repeat center center'})
    }

    log(AJS.file2post)
    reader.readAsDataURL(AJS.file2post)
    return true
  }


  static cancelFile() {
    $('#file-dropper .uppreview').remove() // remove any prior upload/preview
    $('#file-dropper, file-submit, #file-cancel, #file-uploading').hide()
    if (AJS.file_picked)
      delete AJS.file_picked
    if (AJS.file2post)
      delete AJS.file2post
  }


  static badFile() {
    let fail = false

    if (!fail  &&  !AJS.file2post)
      fail = 'file is missing'

    // php upload_max_filesize is 8M
    if (!fail  &&  AJS.file2post.size > 8000000)
      fail = 'file is over 8MB in size'

    if (!fail) {
      const type = AJS.file2post.type.toLowerCase()
      if (type !== 'image/jpeg' && type !== 'image/png' && type !== 'image/gif')
        fail = 'file not required format of JPEG or PNG or GIF'
    }

    if (fail)
      // eslint-disable-next-line  no-alert
      alert(fail)

    return fail
  }


  // for microfilm books with many months of newspapers in PDF
  //   eg: /details/la_caleagle_reel1
  //
  // paginfo is a logical hashmap JSON object of:
  //   YYYYMMDD => [comma separated list of pages]
  // eg:
  //   20080129 =>  "1,2,3,11,17"
  static drawPDF(identifier, pageinfo) {
    const urlstart = '/download/'.concat(
      identifier, '/',
      identifier, '_pdf.zip/',
      identifier, '_pdf/', identifier, '_',
    )
    let multi_year = false
    let last_year  = false

    for (const key of Object.keys(pageinfo)) {
      const year = key.slice(0, 4)
      if (last_year === false) last_year = year
      if (last_year !== year) {
        multi_year = true
        break
      }
    }

    const sep = ''
    let str = sep
    let lastyearmonth = 666
    for (const key of Object.keys(pageinfo)) {
      // eslint-disable-next-line no-continue
      if (key === 'yyyymmdd') continue

      // log(key); log(pageinfo[key]);
      const pages     = pageinfo[key].split(',')
      const year      = key.slice(0, 4)
      const month     = parseInt(key.slice(4, 6), 10)
      const day       = parseInt(key.slice(6, 8), 10)
      const yearmonth = year.concat('-', month)
      let skip_day = false

      let monthName = ''
      if (yearmonth !== lastyearmonth) {
        /**/ if (month ===  1)        monthName = 'January'
        else if (month ===  2)        monthName = 'February'
        else if (month ===  3)        monthName = 'March'
        else if (month ===  4)        monthName = 'April'
        else if (month ===  5)        monthName = 'May'
        else if (month ===  6)        monthName = 'June'
        else if (month ===  7)        monthName = 'July'
        else if (month ===  8)        monthName = 'August'
        else if (month ===  9)        monthName = 'September'
        else if (month === 10)        monthName = 'October'
        else if (month === 11)        monthName = 'November'
        else if (month === 12)        monthName = 'December'
        else if (month === undefined) monthName = 'Single Page PDFs'
        else /*             */        monthName = 'Unknown_'.concat(month)

        if (multi_year) monthName = year.concat(' ', monthName)

        // make header/a that shows/hides a hidden div after it with the month's data
        str += (str ? '</div><!--mo--><br/>' : '')
        str += `
<a href="#${monthName},${year}" class="year-month" data-toggle="#m${yearmonth}">
  <span class="iconochive-folder"></span> ${monthName}
</a>
<div class="mo" id="m${yearmonth}">`
      }

      // make header/a that shows/hides a hidden div after it with the page data
      if ((day === undefined) || (day === '')) skip_day = true
      if (skip_day) {
        str += '<div class="day">'
      } else {
        str += `
<div class="day">
<a href="#${yearmonth}-${day}" class="year-month-day" data-toggle="#m${yearmonth}d${day}">
  <span class="iconochive-folder" /> ${day}
</a>
<div class="pages" id="m${yearmonth}d${day}">`
      }

      // drop in the individual page links
      let offset = 1
      let page
      let pnum
      for (let j = 0; j < pages.length; j++) {
        page = pages[j]
        if (!page)
          // eslint-disable-next-line  no-continue
          continue
        if (offset > 0) offset = 1 - page
        pnum = parseInt(page, 10) + offset

        // left 0-pad to 4 digits as needed
        page = '0000'.concat(page)
        page = page.substr(page.length - 4, 4)

        const url = urlstart.concat(page, '.pdf')
        str += `<a href="${url}">[${pnum}]</a> `
      }

      if (skip_day)
        str += '</div>'
      else
        str += '</div><!--pages--></div><!--day-->'

      lastyearmonth = yearmonth
    }

    str += '</div><!--mo-->'

    // replace the "pdfs" empty div with our hefty HTML
    $('#pdfs .replaced').html(str)

    onclick('#pdfs .year-month', (e) => $($(e.currentTarget).data().toggle).toggle())
    onclick('#pdfs .year-month-day', (e) => $($(e.currentTarget).data().toggle).toggle())
  }


  // for collection pages, [About] tab
  static grafs() {
    const $graph_views_api = $('#grafs_views_api')
    const $grafs2 = $('#grafs2')

    const identifier = $grafs2.attr('data-id')

    log('loading grafs')
    $graph_views_api.html('<i><small>loading graph <img src="/images/loading.gif"/></small></i>').show()
    $grafs2.html('<i><small>loading graph <img src="/images/loading.gif"/></small></i>').show()
    const tok = '<h2>'
    $.get('/details/'.concat(identifier, '&grafs=1&v=3'), (htm) => {
      const a = htm.split(tok)
      if (a.length >= 3) {
        $('#activity-reviewsN').html(a[1]).parents('.activity-box').show()
        $('#activity-forumN  ').html(a[2]).parents('.activity-box').show()
      }
      if (a.length === 6) {
        $graph_views_api.html(tok + a[3])
        $grafs2.html(tok + a[5])
      } else {
        $graph_views_api.html('(graph data not available)')
        $grafs2.html('(graph data not available)')
      }

      AJS.plot_graphs()
    })

    Geo.setUpTopRegionsTable()
  }


  static quick_down(id, target) {
    const idsel = `#${id}`

    if (!$('.format-group.in').length) {
      // no set of files for a single format showing... yet!
      const format = $(target).text()
      const $formatGroup = $(idsel).parents('.format-group')

      $('.download-button').html(format.concat(' FILES'))
      $formatGroup.addClass('in')
      // hide the other summary formats (one-liner) clickables
      $('.format-group:not(.in)').slideUp()
      $(idsel).slideDown()
    } else {
      // re-open all the summary formats (one-liner) clickables
      $('.format-group').slideDown(400)
      // close the open set of single files
      setTimeout(() => { // ftw, thx for nothing jquery
        $('.format-group.in').removeClass('in')
        $('.download-button').html('DOWNLOAD OPTIONS')
      }, 400)
      $(idsel).slideUp()
    }

    return false
  }


  // parse a CGI arg
  static arg(theArgName, try_full) {
    const sArgs = (try_full  &&  location.search === '' ?
      location.href.slice(1).split('&') :
      location.search.slice(1).split('&'))
    for (let i = 0; i < sArgs.length; i++) {
      if (sArgs[i].slice(0, sArgs[i].indexOf('=')) === theArgName) {
        const r = sArgs[i].slice(sArgs[i].indexOf('=') + 1)
        return (r.length > 0 ? unescape(r) : '')
      }
    }
    return ''
  }

  static scrolled() {
    const newtop = $(window).scrollTop()
    // log('scrolled to ', newtop)

    const selector = '.more_search:visible'
    const $e = $(selector)
    if (!$e.length)
      return

    // make the edge detect for "hit bottom" 40 pixels from the bottom
    const check = (($e.offset().top + $e.outerHeight()) - $(window).height()) - 40
    // log('-v- check', check)
    if (newtop > check) {
      log('hit rock bottom > ', check)
      if (!AJS.more_searching)
        $(selector.concat(' > a')).get(0).click() // avoid jQuery - issue w/ webcomponents polyfill
    }
  }


  static more_search(lnk, urlIn, page_now) {
    const selector = AJS.selector()
    if (selector === false)
      return false

    const ikind = selector.replace(/#ikind-/, '')

    const $more_search = $(selector.concat(' .more_search'))

    // we stash a reference of what page the client has requested, so we can increment it on
    // each "more_search hit
    const pageKey = selector
    if (typeof AJS.page_map === 'undefined')
      AJS.page_map = {}
    if (typeof AJS.page_map[pageKey] === 'undefined')
      AJS.page_map[pageKey] = (page_now || 1)

    if (AJS.page_map[pageKey] < 0) {
      // $more_search.find('.more-search-all').show()
      return false // all results showing -- no more for the ikind avail so noop/ignore
    }

    AJS.page_map[pageKey] += 1
    const page = AJS.page_map[pageKey]

    $more_search.find('.more-search-fetching').show()

    AJS.more_searching = true

    let url = urlIn + page
    const urlreplace = location.protocol.concat('//', location.host, url)
    url += '&scroll=1'

    log('url: ', url)              // url to AJAX get next page
    log('urlreplace', urlreplace)  // url to change browser location (visually) to


    log('more_search(selector=', selector, 'sort=', ikind, 'page=', page, 'url=', url, ')')
    // log(AJS.page_map)


    $.get(url, (htm) => {
      if (htm.length < 100  &&  $(htm).find('div.no-results')) {
        // no more results avail/found.  we have reached infinity!
        $more_search.find('.more-search-fetching, a.btn').hide()
        // $more_search.find('.more-search-all').show()
        AJS.page_map[pageKey] = -1 // flag to ignore future more_search attempts
        AJS.more_searching = false
        return
      }

      if (AJS.pushState  &&  typeof history.replaceState !== 'undefined')
        history.replaceState({}, '', urlreplace)


      const selectorID = $(selector).attr('id')
      if (AJS.tilerPREV  &&  AJS.tilerPREV.unsourced  &&  AJS.tilerPREV.unsourced[selectorID])
        delete AJS.tilerPREV.unsourced[selectorID]


      const $selector = $(selector.concat(' .results'))
      $selector.append(AJS.addNotes(AJS.addingNotesKind, htm))

      // re-tile and re-flow!  (the force should flow through you)
      AJS.tiler(selector)
      $more_search.find('.more-search-fetching').hide()
      AJS.more_searching = false

      AJS.parent_hover($selector)


      // OK, this is quite a bit more subtle...  the HTM has been dropped in,
      // *and* we've done a basic re-tiling.  however, it's very likely many
      // of the images are still loading.  so listen for image "is loaded" events
      // if they trickle in, and at most re-tile every 1 second (even if they
      // likely trickling in at a faster rate than that) until they all loaded
      $(selector.concat(' img')).on('load', () => {
        clearTimeout(AJS.more_search_throttler)
        AJS.more_search_throttler = setTimeout(AJS.tiler, 1000)
      })


      if (typeof archive_analytics !== 'undefined')
        archive_analytics.send_scroll_fetch_event(page)
    })

    return false
  }


  // when embed codes are being shown, adjust their heights so they show all the content/codes!
  static embed_codes_adjust() {
    log('showing embeds!')

    // these are found (only) on /details/ pages
    for (const embid of ['embedcodehere', 'embedcodehereWP']) {
      const $embid = $(`#${embid}`)
      $embid.removeAttr('rows').css('height', '')

      const embtxt = $embid.text()

      // this is *puke* city -- since textareas are a PITA, make a shadow div w/ the
      // text we want in it, trying to be same width, same font-size, etc.
      // and *then* insert into DOM invisibily so we can calculate its overall height
      // .. and then peg the textarea height to that height
      $('body').prepend($('<div/>').attr({
        id: `${embid}Shadow`,
        class: 'textarea-invert-readonly roundbox5',
      }).css({
        position: 'absolute',
        visibility: 'hidden',
        top: 60,
        left: 10,
        padding: '5px 15px 5px 15px',
        width: $embid.width(),
        'font-size': $embid.css('font-size'),
      })
        .text(embtxt))

      const bestHT = $(`#${embid}Shadow`).outerHeight() + 15
      log(embid, 'bestie height', bestHT, 'for current width', $embid.width())
      $(`#${embid}Shadow`).remove()

      $embid.height(bestHT)
    }
  }

  /**
   * Dynamically adds modal to page (if isnt there already)
   * @param {String} selector - Id of the modal
   * @param {Object} conf - configuration options:
   *    @param {String || DOM Element} prepended_el - element that modal will be prepended to
   *    @param {String} headerClass - additional class(es) added to header div
   *    @param {String} title - innerHTML of modal h2 heading
   *    @param {String} body - innerHTML of modal body
   */
  static modal_add(selector, conf) {
    if ($(selector).length)
      $(selector).remove();

    const selectorID = selector.replace(/#/, '')
    const { prepended_el = document.body } = conf;

    $(prepended_el).prepend(`
<div id="${selectorID}" class="modal fade" role="dialog" aria-hidden="true">
<div class="modal-dialog modal-lg">
  <div class="modal-content">
    <div class="modal-header ${conf.headerClass !== undefined ? conf.headerClass : 'modal-header-std'}">
      <button type="button" class="close" data-dismiss="modal" aria-hidden="true">
        <span class="iconochive-remove-circle"></span>
      </button>
      <h1 class="modal-title">
        ${typeof conf.title === 'undefined' ? 'Confirmed' : conf.title}
      </h1>
    </div>
    <div id="${selectorID}-body">
      ${typeof conf.body === 'undefined' ? '' : conf.body}
    </div>
  </div>
</div>
</div>`)
    return $(selector);

    // $('body').addClass('blurry') // exxxperiment!
  }

  /**
   * Parse API data and check if the item is successfully marked to favorite or not
   *
   * @param {String} bookmarkRes response data from /bookmarks.php?add_bookmark=1&...
   * @return {Boolean}
   */
  static isFavoriteSuccessful(bookmarkRes) {
    return (bookmarkRes.indexOf('<meta name="ia-favorite-success" content="1">') !== -1)
  }

  /**
   * Gives us ability to have JS intercept an href click and instead do a bootstrap modal.
   * We don't take user to the href target
   *
   * Used to open different modals Like Favorite list or item, share modal etc.
   * @param {HTMLElement} element - HTML element which have been clicked on
   * @param {Array} config - config is a hashmap with optional keys like:- auto_close,
   * auto_remove, * body, center, favorite, * ignore_lnk, titlen, headerClass, shown,
   * follow_link_on_dismiss, add_modal
   * @return {Boolean}
   */
  static modal_go(element, config) {
    const conf = config
    const $element = $(element)

    // load bootstrap JS on demand, if not already loaded (then re-call ourself)
    if (typeof $.fn.modal === 'undefined') {
      if (config.recalling)
        throw Error('still cant modal -- are there two jquery on the page?')
      // eslint-disable-next-line no-param-reassign
      config.recalling = 1
      import('https://esm.archive.org/bootstrap@^3.0.0').then(() => AJS.modal_go(element, config))
      return false
    }

    if (conf.favorite) {
      // login is required to favorite item
      conf.login = true // must be logged in!

      if (Cookies.get('logged-in-user') !== undefined) {
        // toggle favorite, unfavorite icon
        Manage.toggle_favorite_icon($element, true);

        // update favorite count on details page
        Manage.update_favorite_count(true);
      }
    }

    const selector = $element.attr('data-target')
    const href = conf.favorite ? $element.attr('data-href') : $element.attr('href');

    if (!conf.ignore_lnk  ||  conf.add_modal)
      AJS.modal_add(selector, conf)

    if (conf.shown) {
      $(selector).on('shown.bs.modal', () => {
        conf.shown()
      })
    }

    if (conf.follow_link_on_dismiss) {
      $(selector).on('hidden.bs.modal', () => {
        log('modal hidden, going to ', href, '..')
        $('body').removeClass('blurry')
        location.href = href
      })
    }

    if (conf.login && Cookies.get('logged-in-user') === undefined) {
      if (location.protocol !== 'https:') {
        // make absolutely sure we never login with http!
        location.href = 'https://archive.org/account/login'
        return false
      }

      const url = '/account/login'
      $.get(url, (htmIn) => {
        // this allows us to effectively rip off the header/nav and footer
        // if we are accessing a full page (eg: account login page)
        const htm = ($(htmIn).find('.container-ia > div').length ?
          $(htmIn).find('.container-ia > div').get(0) :
          htmIn
        )

        // Add class to identify as login variant
        $(selector).addClass('login-modal')

        $(selector.concat('-body')).html(htm)
        $(selector).modal('show')

        const $form = $(selector.concat('-body form:has(input[type=submit])'))
        if (!$form.length)
          return

        const $icon = $('.password_icon')[0]

        if (navigator.cookieEnabled === true) {
          $('.cookie-warning').addClass('hidden')
          $('.login-form :input').prop('disabled', false)

          $icon.src = '/images/eye-crossed.svg'
          $icon.alt = 'Show text'

          $('.password_icon').on('click', () => {
            const $input_password = $('.input-password')[0]
            if ($input_password.type === 'password') {
              $input_password.type = 'text'
              $icon.src = '/images/eye.svg'
              $icon.alt = 'Hide text'
            } else {
              $input_password.type = 'password'
              $icon.src = '/images/eye-crossed.svg'
              $icon.alt = 'Show text'
            }
          })

          $('.input-email, .input-password').on('focus', () => {
            $('.password-error').html('')
            $('.reset-password').show()
          })
        } else {
          // If no cookies, show warning, disable login form
          $('.cookie-warning').removeClass('hidden')
          $('.login-form :input').prop('disabled', true)
        }

        loginModal({
          $form,
          url,
          selector,
          element,
          conf,
        })
      })

      return false
    }

    if (conf.auto_remove) {
      conf.auto_close = true
      $(selector).on('hidden.bs.modal', () => {
        $(selector).remove()
        $('body').removeClass('blurry')
      })
    }

    if (!conf.ignore_lnk) {
      $.get(href, (res) => {
        if (conf.favorite) {
          if (typeof archive_analytics !== 'undefined') {
            archive_analytics.send_ping({
              kind: 'event',
              ec: 'page_action',
              ea: 'favorite',
              el: location.pathname,
              cache_bust: Math.random(),
            })
          }

          if (AJS.isFavoriteSuccessful(res)) {
            setTimeout((() => {
              if (conf.postLogin)
                location.reload(true)
            }), AJS.modalInterval)
          } else {
            // toggle favorite, unfavorite icon
            Manage.toggle_favorite_icon($element, false);

            // update favorite count on details page
            Manage.update_favorite_count(false);

            const $favModal = $(selector)
            const failMessage = `
              <center>
                <p class="favorite-failure-message">
                  There was an error adding the favorite. If the problem persists, please contact support.
                </p>
              </center>
            `
            $favModal.find('.modal-title').html('Failed')
            $favModal.find(`${selector}-body`).html(failMessage)
            $(selector).modal('show')
          }
        } else {
          $(selector).modal('show')
          if (conf.auto_close)
            setTimeout((() => $(selector).modal('hide')), AJS.modalInterval)
        }
      })
      $(selector).on('hidden.bs.modal', () => {
        $(selector).remove()
      })
    } else {
      $(selector).modal('show')
    }

    if (conf.center)
      $(selector.concat(' .modal-dialog')).center() // vertically center

    if (conf.auto_close && conf.ignore_lnk)
      setTimeout(() => $(selector).modal('hide'), AJS.modalInterval)

    return false
  }


  static suffixFmt(val, axis) {
    if (axis.min >= 0.0  &&  axis.max <= 5)
      // give a little bit more granularity of 1 decimal point...
      return Math.round(val * 10, 1) / 10

    if (val >= 1000000) return (val / 1000000).toFixed(0).concat(' M')
    if (val >=    1000) return (val /    1000).toFixed(0).concat(' K')
    return val.toFixed(0)
  }


  static suffixFmtPercent(val, axis) {
    return AJS.suffixFmt(val, axis).concat('%')
  }


  /**
   * Return singular or plural string given integer
   *
   * @param {integer} nInt integer
   * @param {string} strOne singular string
   * @param {string} strMany plural string
   */
  static pluralize(nInt, strOne, strMany) {
    if (nInt === 1) {
      // Singular
      return strOne
    }
    // Plural
    return strMany
  }

  /**
   * Return table tooltip of stack chart values
   *
   * @param {array} time split string of date
   * @param {array} values int stack chart values
   * @param {array} labels string stack chart labels
   */
  static viewMessage(time, values, labels) {
    const rows = values.length
    let msg = '<table><tr>'
    msg += `<th class="tt-date" rowspan="${rows}">${time[2]} ${time[3]}</th>`
    msg += `<td class="tt-number">${add_commas(values[0])}</td>`
    msg += `<td>${AJS.pluralize(values[0], 'View', 'Views')} ${labels[0]}</td></tr>`
    // For every stack after the 0th above
    for (let i = 1; i < rows; i++) {
      msg += `<tr><td class="tt-number">${add_commas(values[i])}</td>`
      msg += `<td>${AJS.pluralize(values[i], 'View', 'Views')} ${labels[i]}</td></tr>`
    }
    msg += '<table>'
    return msg
  }


  static plot_graphs() {
    $('.js-ajs-plotter').each((_idx, e) => {
      const kv = JSON.parse($(e).val())
      AJS.plotter(() => {
        log('js-ajs-plotter', kv)
        const cfg = JSON.parse(kv.cfg)
        if (kv.dayBarsNoPoints)
          cfg.dayBarsNoPoints = true
        if (kv.dark)
          cfg.dark = true

        // string => function nonideal, but moving on...
        if (cfg.yaxis?.tickFormatter === 'AJS.suffixFmt')
          cfg.yaxis.tickFormatter = AJS.suffixFmt

        if (kv.fmt === 'AJS.broadcastsTooltip')
          kv.fmt = AJS.broadcastsTooltip
        else if (kv.fmt === 'AJS.airedTooltip')
          kv.fmt = AJS.airedTooltip
        else if (kv.fmt?.length === 3 && kv.fmt[0] === 'AJS.graphsTooltip')
          kv.fmt = AJS.graphsTooltip(kv.fmt[1], kv.fmt[2])
        else if (kv.fmt?.length === 3 && kv.fmt[0] === 'AJS.statsTooltip')
          kv.fmt = AJS.statsTooltip(kv.fmt[1], kv.fmt[2])

        AJS.plot(kv.id, cfg, kv.fmt, JSON.parse(kv.pts), kv.many)
      })
    })
  }

  static broadcastsTooltip(x, y) {
    const t = new Date(x).toUTCString().split(' ')
    return `<nobr>${add_commas(y)} broadcasts on ${t[2]} ${t[3]}</nobr>`
  }

  static airedTooltip(x, y) {
    const t = new Date(x).toDateString().split(' ')
    return `<nobr>Aired ${add_commas(y)} times on ${t[1]} ${t[2]}</nobr>`
  }

  static graphsTooltip(gtitle, xindex) {
    return (x, y) => {
      const t = new Date(x).toDateString().split(' ')
      return `<nobr>${add_commas(y)} ${gtitle} in ${t[1]} ${xindex === 'day' ? t[2] : ''} ${t[3]}</nobr>`
    }
  }

  /**
   * Return function to be evaluated as graph item tooltip
   *
   * @param {string} method type of formatting string
   * @see www/common/Graph.inc Graph::easyBarsXTime()
   */
  static statsTooltip(method, dateOffset = 0) {
    let message
    switch (method) {
    case 'main': {
      message = ({ y, t }) => `${add_commas(y)} total items in <strong>${t[2]} ${t[3]}</strong>`
      break
    }
    case 'item': {
      message = ({ t, item }) => `<strong>${t[2]} ${t[3]}</strong>: ${add_commas(item.datapoint[1])} ${AJS.pluralize(item.datapoint[1], 'Item', 'Items')}`
      break
    }
    case 'download': {
      message = ({ t, item }) => `<strong>${t[2]} ${t[3]}</strong>: ${add_commas(item.datapoint[1])} ${AJS.pluralize(item.datapoint[1], 'Download', 'Downloads')}`
      break
    }
    case 'view': {
      message = ({ t, values, labels }) => AJS.viewMessage(t, values, labels)
      break
    }
    default: {
      break
    }
    }
    const fn = (x, y, item, values, labels) => {
      const t = new Date(x - dateOffset).toUTCString().split(' ')
      const params = {
        x, y, item, t, values, labels,
      }
      return `<span style="white-space: nowrap;">${message(params)}</span>`
    }
    return fn
  }

  // this allows easy setup for resize/orientation triggers for all graphs
  // on a page that use this!
  static plotter(callback) {
    if (typeof AJS.plotters === 'undefined')
      AJS.plotters = []

    if (callback) {
      // stash a copy of the callback for resize/orientationchange triggers
      AJS.plotters.push(callback)

      // now do the actual plotting (eg: page load)
      callback()
    } else {
      // step through each graph and rerun them
      log('plotter() resize/orient change', AJS.plotters.length, 'graphs to resize')
      for (let i = 0; i < AJS.plotters.length; i++)
        AJS.plotters[i]()
    }
  }


  // Graphing for archive.org/services/views.php and TV
  static plot(id, cfgIn, fmt_fn, pts, many) {
    const cfg = cfgIn
    if (!cfg.xaxis)
      cfg.xaxis = { mode: 'time', color: (cfg.dark ? '#ccc' : '#545454') }
    if (!cfg.yaxis)
      cfg.yaxis = { color: (cfg.dark ? '#ccc' : '#545454') }

    let barWidth
    if (many && cfg.barWidth)
      barWidth = cfg.barWidth * 1 // *1 to pass lint; keeps like below; avoid obj destructuring
    else if (cfg.barWidth)
      barWidth = cfg.barWidth * 86400 * 1000
    else
      barWidth = (cfg.dayBarsNoPoints ? 1 : 7) * 86400 * 1000 // 1day|1week

    if (!cfg.color)
      cfg.color = '#385C74'

    if (cfg.stack) {
      cfg.series = {
        stack: true,
        bars: {
          show: true,
          barWidth,
          fill: true,
        },
        legend: {
          show: true,
        },
      }
    } else {
      cfg.series = {
        bars: {
          show: true,
          barWidth,
          fill: 0.6,
          color: cfg.color,
        },
        color: cfg.color,
        points: { show: !cfg.dayBarsNoPoints },
      }
    }

    if (typeof cfg.grid === 'undefined') {
      cfg.grid = {
        borderColor: (cfg.dark ? '#333' : '#aaa'),
        hoverable: true,
      }
    }
    // log(cfg.series.bars)


    if (cfg.dark)
      cfg.grid.backgroundColor = '#002b36'

    if (!cfg.tip)
      cfg.tip = {}
    if (!cfg.tip.id)
      cfg.tip.id = id

    if (typeof window.GraphPriorIndex === 'undefined')
      window.GraphPriorIndex = {}

    // fully elaborated graph data
    let graph_data = []
    if (cfg.series.stack) {
      // [{},{}, ...]
      // each with data:[], label:""
      graph_data = pts
    } else {
      // eslint-disable-next-line  no-nested-ternary
      graph_data = (many ? pts : (typeof pts.data === 'undefined' ? [{ data: pts }] : [pts]))

      if (cfg.dayBarsNoPoints  &&  !cfg.noLabel)
        graph_data[0].label = id
    }

    const selid = `#${id}`

    import('https://esm.archive.org/flot@%5E0.8.0').then(() => {
      // import plugins in parallel
      Promise.all([
        import('https://esm.archive.org/flot@%5E0.8.0/jquery.flot.time.js'),
        import('https://esm.archive.org/flot@%5E0.8.0/jquery.flot.stack.js'),
      ]).then(() => {
        const plotFunction = $.plot($(selid), graph_data, cfg)

        if (!fmt_fn)
          return

        $(selid).bind('plothover', (event, pos, item) => {
          if (!item) {
            window.GraphPriorDatapoint = [0, 0, 0]
            $('#gtip').remove()
            return
          }

          if (window.GraphPriorDatapoint !== item.datapoint) {
            window.GraphPriorDatapoint = item.datapoint
            $('#gtip').remove()

            const values = []
            const labels = []
            // If stack graph, prepare data and labels for tooltip
            if (cfg.stack) {
              const data = plotFunction.getData()
              // For each series of data (stack in stacked graph)
              for (let i = 0; i < data.length; i++) {
                const series = data[i]
                labels[i] = series.label
                for (let j = 0; j < series.data.length; j++) {
                  // If same x value as mouseover value
                  if (series.data[j][0] === item.datapoint[0]) {
                    // store y value
                    // eslint-disable-next-line prefer-destructuring
                    values[i] = series.data[j][1]
                    break
                  }
                }
              }
            }

            const str = fmt_fn(item.datapoint[0], item.datapoint[1], item, values, labels)
            const $graf = $(selid)
            const off = $graf.offset()

            // figure out which way from the "dot"/bar in the graph the
            // tooltip should go -- left or right!
            let { pegTo } = cfg.tip
            if (!pegTo)
              pegTo = ((pos.pageX - off.left) > ($graf.width() / 2) ? 'right' : 'left')

            const pegToVal = (pegTo === 'right' ?
              ($graf.width() - (pos.pageX - off.left - 20)) :
              (pos.pageX - off.left) + 20)
            log(pegTo, pegToVal)

            $(`#${cfg.tip.id}`).append(`<div id="gtip" class="roundbox5 grafs-tooltip" style="top:${pos.pageY - off.top}px; ${pegTo}:${pegToVal}px">${str}</div>`).fadeIn(200)
          }
        })
      })
    })
  }


  /**
   * Use the following function to make an image, div, etc focusable, and 'click'-able.
   * Function adds a tabindex for 'focus' and listens for a keydown/keypress of enter or space,
   * then triggers a click.
   *
   * var element: String used for jquery capture of non-acessible & mouse-only element.
   *    ex: "#AmazonPayButton img"
   * Triggers 'click' on element.
   */
  static makeMouseElementAccessible(element) {
    $(element).attr('tabindex', '0').on('keypress keydown', function makeMouseElementAccessibleGo(e) {
      if (e.type !== 'click') {
        const code = (e.keyCode || e.which)
        const k_space = 32 // space bar pressed
        const k_enter = 13 // enter key pressed
        if ([k_space, k_enter].indexOf(code) !== -1)
          $(this).click()
      }
    })
  }


  // use something like ',' for the optional 3rd arg if you want to allow
  // for appending 2+ values into a field, etc...
  static autocomplete(selector, options, multiValSplitChar) {
    import('https://esm.archive.org/jqueryui@1.11.1/jquery-ui.min.js').then(() => {
      $(selector).autocomplete({
        appendTo: '#autocompletee', // NOTE: ending `ee` is correct ;-)
        minLength: 0,
        source: (request, response) => {
          // delegate back to autocomplete, but extract the last term
          response($.ui.autocomplete.filter(options, request.term.split(/,\s*/).pop()))
        },
        focus: () => false, // prevent value inserted on focus
        select: function autocomplete_select(event, ui) {
          if (multiValSplitChar) {
            const terms = this.value.split(/,\s*/)
            // remove the current input
            terms.pop()
            // add the selected item
            terms.push(ui.item.value)
            // add placeholder to get the comma-and-space at the end
            terms.push('')
            this.value = terms.join(', ')
          } else {
            this.value = ui.item.value
          }
          return false
        },
      })
    })
  }


  static addNotes(kind, htm) {
    // flag lists have multiple users so the "rights" there
    // is a bit to thorny right now so for simplicity and
    // the main feature to go live, skipping them...
    if (kind !== 'favorite'  &&  kind !== 'list')
      return htm

    if (!htm  &&  $('body').hasClass('editable'))
      AJS.addingNotesKind = kind
    if (!AJS.addingNotesKind)
      return htm

    AJS.addNoteHTM = $(`
<div class="note">
  <span class="edit">
    <a href="#" class="js-note-add">Add a Note</a>
  </span>
</div>`)

    log('addNotes')

    // Next, we are going to do a global DOM search and insert (where needed)
    // for basically the first page load.  But we're also called in "infinite scroll"
    // page 2+ mode, and in that case, we want to modify (JUST) the HTM when that's
    // for page 2+ and about to be inserted into the DOM, *instead* of another global
    // DOM search.
    if (htm) {
      // (Basically we are now doing page 2+ in infinite scroll)
      // OK this is sorta wild/maybe not obvi...a
      // (Kinda like a jQuery replace_regexp()...)
      // Take the *string* of HTM we are passed, convert it to a "findable" jQuery object
      // then insertd "addNoteHTM" where needed.
      // Finally, convert back to string and return this modified version to caller.
      const $htm = $(`<div>${htm}</div>`)
      $htm.find('.details-ia .C234:not(:has(".note"))').append(AJS.addNoteHTM)
      return $htm.html()
    }

    // this is initial page load
    $('.details-ia .C234:not(:has(".note"))').append(AJS.addNoteHTM)

    // NOTE: return value irrelevant here
    return onclick('.js-note-add', (e) => AJS.editNote(e.currentTarget))
  }


  static editNote(e) {
    const $e = $(e)
    const identifier = $e.parents('.details-ia').prev().attr('data-id')
    if (!identifier)
      return false

    const $note = $e.parents('.note')

    let val = ''
    if ($e.text() === 'edit') {
      val = $note.find('span:first').text()
      val = val.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }
    $note.hide()
    $note.parent().append($(`
<form class="js-note-submit form form-horizontal note" role="form">
  <div class="form-group">
    <div class="col-xs-2 col-md-1 col-lg-1">
      <b>Note:</b>
    </div>
    <div class="col-xs-10 col-md-6 col-lg-7">
      <textarea class="form-control" name="comments">${val}</textarea>
      <div class="clearfix visible-xs-block"></div>
    </div>
    <div class="clearfix visible-xs-block"></div>
    <div class="col-xs-12 col-md-5 col-lg-4 btns">
      <button type="button" class="js-note-edited btn btn-success btn-xs">Save</button>
      <button type="button" class="js-note-edited btn btn-info btn-cancel btn-xs">Cancel</button>
      <button type="button" class="js-note-edited btn btn-danger btn-xs ${val ? '' : 'hidden'}">Remove</button>
    </div>
  </div>
</form>`))

    onclick('.js-note-edited', (el) => AJS.editedNote(el.currentTarget))
    onsubmit('.js-note-submit', (el) => AJS.editedNote(el.currentTarget))

    return false
  }

  static editedNote(e) {
    let $e = $(e)

    const identifier = $e.parents('.details-ia').prev().attr('data-id')
    if (!identifier)
      return

    // if user hit [return] and submitted form, etc.
    // treat it like they hit the [Save] button
    if ($e.is('form'))
      $e = $e.find('button:contains("Save")')

    const action = $e.text()
    const $parent = $e.parents('.note')
    const $origNote = $parent.prev()

    if (action === 'Save'  ||  action === 'Remove') {
      const val  = (action === 'Save' ? $parent.find('textarea').val() : '')
      const  url = '/bookmarks.php?identifier='.concat(
        identifier, '&kind=', AJS.addingNotesKind,
        '&add_comment=', encodeURIComponent(val),
      )
      log('get ', url)
      $.get(url, () => {
        const htm = (val ?
          `Note: "<span>${val.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>"
          <span class="edit">(<a href="#" class="js-note">edit</a>)</span>` :
          AJS.addNoteHTM.html())
        // show the "Note: ..." section again (with now appropriately updated innards)
        $origNote.html(htm).show()
        $parent.remove() // lose the form
        onclick('.js-note', (evt) => AJS.editNote(evt.currentTarget))
      })
      return
    }
    // else Cancel does nothing but below...

    $origNote.show() // show the "Note: ..." section again
    $parent.remove() // lose the form
  }


  static thumbzilla(id = '') {
    /* global  TV2  */
    // cover entire screen with new div...
    const TV = $('body').hasClass('tv')
    if (TV && window?.TV2) // NOTE: TV2 isnt a global JS var anymore
      TV2.unplay('thumbzilla')

    // eslint-disable-next-line no-param-reassign
    if (!id) id = location.pathname.match(/\/details\/([^/&?]+)/)?.[1]

    let htm = ''

    // we might be calling this after AJAX success below, finding the item thumbnails
    const render = () => {
      $('#opscreen1M').remove()
      $('body').prepend($('<div />').attr({ id: 'opscreen1M' }))

      const $imgs = $('<div/>').attr({ id: 'thumbzilla' }).html(`<div>${htm}</div>`)
      $imgs.appendTo('#opscreen1M')
      $('#opscreen1M').css('visibility', 'hidden').show()
      const winH = $(window).height() + (ios ? 60 : 0) // plus iOS bleah
      for (let w = 720; w >= 10; w -= 10) {
        const h = Math.round(w * (110 / 160.0))
        log('TRYING', w, 'x', h)
        $('#thumbzilla img').css({ width: w, height: h })
        if ($('#thumbzilla img:last').offset().top + h <= winH)
          break
      }

      $('#thumbzilla div').center()
      $('#opscreen1M').hide().css('visibility', 'visible').fadeIn('slow')
        .one('click.opscreen1M.nixer', () => $('#opscreen1M').fadeOut('slow'))
      if (window?.TV2) {
        onclick('.js-tvthumb', (e) => {
          $('#opscreen1M').fadeOut('slow')
          TV2.seekURL($(e.currentTarget).href.replace(/^\/details\/[^/+]/, ''))
        })
      }
    }


    // get list of thumbs
    if (TV && $('.js-tv3-init').length) {
      const TV3 = JSON.parse($('.js-tv3-init').val() ?? '{}')
      $(TV3['TV3.thumbzillas']).each((_key, val) => {
        const start = parseInt(val, 10)
        const startend = `/details/${id}/start/${start}/end/${start + TV3['TV3.CLIP_SEC_MAX2']}`
        htm += `<a class="js-tvthumb" href="${startend}">`
        htm += `<img src="/download/${id}/${id}.thumbs/${id}_${val}.jpg"/></a>`
      })
      render()
    } else {
      $.getJSON(`/metadata/${id}/files`, (resp) => {
        for (const file of resp.result) {
          const start = 'original' in file  &&  file.name.match(/\.thumbs\/.*_([0-9]+)\.jpg$/)
          if (start) {
            htm += `
              <a href="/details/${id}/${file.original}?start=${Number(start[1])}"><img src="/download/${id}/${file.name}"></a>
            `
          }
        }
        if (htm)
          render()
      })
    }

    return false
  }


  /**
   * Sets up listeners on search forms to handle opening/closing the search options.
   *
   * @see SearchOptions.inc
   */
  static setUpSearchForms() {
    const body = $(document.body)
    const searchForms = $('.js-search-form')

    /**
     * Sets up an individual form, isolating its event listeners from the other ones.
     *
     * @param {HTMLFormElement} formNode
     */
    function setUpSearchForm(formNode) {
      const form = $(formNode)
      const searchBar = form.find('.js-search-bar')
      const searchOptions = form.find('.js-search-options')
      const keepOpenWhenChanged = searchOptions.data('keepOpenWhenChanged')
      let formChanged = false

      /**
       * Catches web searches and redirects them to Wayback Machine. The search form must have a
       * "data-wayback-machine-search-url" attribute set in order for this method to work (and the
       * method assumes the query can be tacked onto the end of this URL). For all other kinds of
       * searches, does nothing.
       *
       * @param {Event} event
       */
      function redirectWaybackSearches(event) {
        const { waybackMachineSearchUrl } = this.dataset
        const elements = $(this.elements)
        const checkedInput = elements.filter('[name="sin"]:checked')
        const searchInput = elements.filter('[name="search"]')
        const sinValue = checkedInput.length ? checkedInput[0].value : ''
        const searchValue = searchInput.length ? searchInput[0].value : ''

        if (waybackMachineSearchUrl && sinValue === 'WEB') {
          event.preventDefault()

          window.location = [
            // Remove trailing slash just in case.
            waybackMachineSearchUrl.replace(/\/$/, ''),
            searchValue,
          ].join('/')
        }
      }

      function openOptions() {
        searchOptions
          .addClass('is-open')
          .attr('aria-expanded', true)
      }

      function closeOptions() {
        searchOptions
          .removeClass('is-open')
          .attr('aria-expanded', false)
      }

      /**
       * Closes options if the newly focused element is outside of the form (and not autocomplete
       * results) and the form is configured to close when it is no longer active.
       *
       * @param {HTMLElement} targetElement element being clicked or receiving focus
       */
      function handleFocusChange(targetElement) {
        if (
          !targetElement ||
          form[0].contains(targetElement) ||
          (keepOpenWhenChanged && formChanged) ||
          $(targetElement).parents('.ui-autocomplete').length
        )
          return

        closeOptions()
      }

      if (form.length) {
        form.on('submit', redirectWaybackSearches)

        if (!searchOptions.hasClass('is-open')) {
          body.on('click', (event) => {
            handleFocusChange(event.target)
          })

          form
            .on('change', () => {
              formChanged = true
            })
            .on('focusout', (event) => {
              handleFocusChange(event.relatedTarget)
            })

          searchBar.on('focusin', () => {
            openOptions()
          })
        }
      }
    }

    searchForms.each((index, node) => setUpSearchForm(node))
  }


  /**
   * Expandable/collapsible accordion component, implemented with <details>
   * elements
   *
   * The JavaScript guarantees only one <details> is open at a time and
   * scrolls the open <details>'s content into view.
   *
   * @see accordion.less
   */
  static setUpAccordions() {
    /**
     * Closes all <details> elements in detailsEls, except selectedDetails
     *
     * @param {HTMLDetailsElement[]} detailsEls
     * @param {HTMLDetailsElement}   selectedDetails
     */
    function closeAllExcept(detailsEls, selectedDetails) {
      Array.from(detailsEls)
        .forEach((details) => {
          if (details !== selectedDetails) {
            // eslint-disable-next-line no-param-reassign
            details.open = false
          }
        })
    }

    /**
     * Sets up a single accordion component
     *
     * @param {HTMLElement} accordion
     */
    function setUpAccordion(accordion) {
      /**
       * Responds to the "toggle" event on a <details>
       *
       * @param {Event} event
       */
      function handleToggle(event) {
        if (!event.target.open) return

        closeAllExcept(
          accordion.querySelectorAll('details'),
          event.target,
        )

        // See https://www.abeautifulsite.net/smoothly-scroll-to-an-element-without-a-jquery-plugin-2
        $('html, body').animate({
          scrollTop: $(event.target).offset().top,
        }, 400)
      }

      Array.from(accordion.querySelectorAll('details'))
        .forEach((details) => {
          details.addEventListener('toggle', handleToggle)
        })

      accordion.setAttribute('data-accordion-ready', '')
    }

    Array.from(document.querySelectorAll('[data-accordion]'))
      .forEach(setUpAccordion)
  }

  /**
   * Handles click on search 'Advanced Search' link.
   *
   * If 'Search TV news captions' is checked, we ignore the link click
   * and create and open TV advanced search popup right on the page.
   *
   * @return {boolean}  true for browser to go to normal advanced search page; else false
   */
  static advanced_search(link) {
    if (!AJS.is_advanced_TV_search(link))
      return true

    // this means we want TV advanced search form behaviour instead!
    if (!AJS.adv) {
      AJS.adv = {
        mapping: false,
      }
    }

    // only reload the resources below at most 1x/day
    const ymd = new Date().toISOString().substr(0, 10) // eg: 2017-06-28
    $.ajaxSetup({
      cache: true,
    })

    // NOTE: using new JS Promise / jQuery Promise-ish Deferred..
    // NOTE: if we are invoking this more than once, we reuse prior results
    // NOTE: ymd forces reload at least once a day
    // NOTE: if any resources happen to _already_ be loaded in <head>, use them
    const i = `https://${location.host}/includes/`
    $.when(
      (typeof TVSearch !== 'undefined' || $.getScript(i.concat('build/js/tvsearch.min.js?', ymd))),
      (AJS.adv.mapping || $.getJSON('/details/tv?mappings&output=json&'.concat(ymd), (mapping) => {
        AJS.adv.mapping = mapping
      })),
    ).then(() => {
      if (AJS.adv.mapping.length !== 2) {
        // eslint-disable-next-line  no-alert
        alert('failed to get network and program mappings!')
        return
      }

      /* global  TVSearch */
      TVSearch.proPick(AJS.adv.mapping, link)
    })


    return false
  }


  /**
   * Returns whether or not 'Advanced Search' should be handled via JS
   * (which as of now is just TV FTS to make a popup show up).
   * Logically private.
   *
   * @param  {DOM element}  elm 'Advanced Search' link element that was just clicked
   * @return {Boolean}      should handle with JS and not directly go to /advanced_search.php?
   */
  static is_advanced_TV_search(elm) {
    if (location.hostname === 'web.archive.org')
      return false

    // for now at least, tracey felt should avoid handling link on IA top/home page even when
    // TV FTS is picked.  for consistency, this is _definitely_ worth revisiting.
    if ($(document.body).hasClass('top'))
      return false

    const $form = $(elm).parents('form')
    if ($form.find('.js-search-options input[value=TV]').is(':checked'))
      return $form

    return false
  }

  // Returns true if element's text is clamped
  // I.e. text currently has rows hidden by -webkit-line-clamp
  static isTextClamped(element) {
    return element.clientHeight < element.scrollHeight;
  }

  // Add checkbox click event listener
  static bindClampCheckbox(element) {
    // Assumes <input type="checkbox"> is next sibling of js-clamp element
    const inputElement = element.nextElementSibling
    if (inputElement && inputElement.type === 'checkbox') {
      let ElementTop;
      let scrollTop;
      $(inputElement).on('click', () => {
        if ($(inputElement).is(':checked')) {
          // "More" clicked, set Y restore value
          const WindowTop = window.visualViewport.pageTop
          ElementTop = element.getBoundingClientRect().top + WindowTop
          // If top of element is not in view, set to scroll slightly above top of element
          scrollTop = (ElementTop < WindowTop) ? ElementTop - 10 : WindowTop
        } else if (ElementTop < window.visualViewport.pageTop) {
          // "Less" clicked, scroll window back to where "More" clicked
          window.scrollTo({ top: scrollTop, behavior: 'instant' })
        }
      })
    }
  }

  // Remove checkbox click event listener
  static unbindClampCheckbox(element) {
    // Assumes <input type="checkbox"> is next sibling of js-clamp element
    const inputElement = element.nextElementSibling;
    if (inputElement && inputElement.type === 'checkbox' && inputElement.checked) {
      $(inputElement).off('click')
    }
  }
} // end class AJS

$(() => {
  $('.tabby a').click((e) => {
    const tabby = $(e.currentTarget).attr('data-tabby')
    AJS.tabby(e.currentTarget, `tabby-${tabby}`)
  })

  // NOTE: this one goes first because we want `AJS.lists_v_tiles_setup()` called ASAP
  $('.js-tiles-setup').each((_idx, e) => {
    const kv = JSON.parse($(e).val())
    AJS.lists_v_tiles_setup(kv.toggle_range)

    $('div.ikind').css({ visibility: ' visible' })

    if (kv.popState !== false)
      AJS.popState(kv.popState)

    AJS.tiler()

    $(window).on('resize  orientationchange', (evt) => {
      clearTimeout(AJS.tiles_wrap_throttler)
      AJS.tiles_wrap_throttler = setTimeout(AJS.tiler, 250)
    })

    // register for scroll updates (for infinite search results)
    $(window).scroll(AJS.scrolled)
  })

  // Use this global hack, by adding class 'accessible-link' to any mouse-only element div/img
  AJS.makeMouseElementAccessible('.accessible-link')

  if (typeof archive_analytics !== 'undefined')
    archive_analytics.set_up_event_tracking()

  $('.js-tiles-toggle').click((e) => {
    const range = $(e.currentTarget).attr('data-range')
    return AJS.tiles_toggle(e.currentTarget, range)
  })

  $('.js-ikind-link').click((e) => {
    const ikind = $(e.currentTarget).attr('data-id')
    AJS.ikind(e.currentTarget, `ikind-${ikind}`)
  })

  $('.js-more-search').click((evt) => {
    const e = evt.currentTarget
    const more_search = decodeURIComponent($(e).attr('data-more-search'))
    const page = parseInt($(e).attr('data-page'), 10)
    AJS.more_search(e, more_search, page)
    return false
  })

  $('#showdetails').on('change', (e) => {
    const toggle_range = $(e.currentTarget).attr('data-toggle-range')
    AJS.showdetails_toggle(toggle_range)
  })

  $('.ikind-mobile').on('change', (e) => {
    AJS.ikind_mobile_change(e.currentTarget)
  })

  // UI component initialization
  AJS.setUpSearchForms()
  AJS.setUpAccordions()

  if (typeof archive_analytics !== 'undefined')
    archive_analytics.create_tracking_image('external_executes')

  AJS.modalInterval = 2000

  Banners.init()
  SearchAutocomplete.setup()


  $('.js-search-beta-opt-in').each((_idx, e) => {
    $(e).on('click', () => {
      window.localStorage.setItem('SearchBeta-opt-in', true)
    })
  })

  $('.js-collection-setup').each((_idx, e) => {
    const kv = JSON.parse($(e).val())

    if (kv.about)
      AJS.grafs()

    AJS.addNotes(kv.is_list)

    $(window).on('resize  orientationchange', (evt) => {
      clearTimeout(AJS.plotter_throttler)
      AJS.plotter_throttler = setTimeout(AJS.plotter, 250)
    })
  })

  $('.js-collection-setup2').each((_idx, e) => {
    const kv = JSON.parse($(e).val())
    if (kv.editable) {
      $('#editlink').show()
      if (kv.image !== '')
        AJS.head_img_dragdrop_setup(kv.image)
    }
  })

  $('.js-account-setup').each((_idx, e) => {
    const kv = JSON.parse($(e).val())
    AJS.head_img_dragdrop_setup(kv.dragdrop)
    if (kv.darking_ids?.length)
      Manage.decorate_pendings(kv.darking_ids)
  })

  AJS.plot_graphs()

  $('.js-pages').each((_idx, e) => {
    const kv = JSON.parse($(e).val())
    AJS.drawPDF(kv.identifier, JSON.parse(kv.pages))
  })

  $('.js-carousel2').each(() => {
    AJS.theatresize()
    AJS.carouselsize('#ia-carousel', true)
  })

  $('.tablesorter').each((_idx, e) => {
    const opts = { textExtraction: 'complex' }
    if ($('body').hasClass('js-tv-programPageColumnSorting')) {
      // TV thumbnail column -- no sorting
      opts.headers = { 0: { sorter: false } }
    } else if ($('body').hasClass('services-views')) {
      opts.ignoreCase = true
      opts.sortList = [[1, 0]]
      opts.widgets = ['saveSort']
      opts.widgetOptions = { saveSort: true }
    }

    // load on demand
    if (typeof $.fn.tablesorter === 'undefined') {
      import('https://esm.archive.org/tablesorter?deps=jquery@3.6.1').then(() => {
        $(e).tablesorter(opts)
      })
    } else {
      $(e).tablesorter(opts)
    }
  })

  onclick('.js-ebook-maker', async (el) => {
    const e = el.currentTarget
    e.parentElement.textContent = 'Generating...'

    const { maker } = $(e).data()
    log({ maker })

    // eslint-disable-next-line compat/compat
    const body = new URLSearchParams()
    for (const [k, v] of Object.entries(maker))
      body.append(k, encodeURIComponent(v))

    // eslint-disable-next-line compat/compat
    const res = await fetch('/services/make-ebook.php', { method: 'POST', body })
    log({ res })
  })

  // Either of these will require bootstrap JS to be loaded
  const dateswitch = $('.js-date_switcher')
  const tooltips = !AJS.isTouchDevice()  &&  typeof $.fn.tooltip === 'undefined'
    ? $('.container-ia [data-toggle="tooltip"], #cols [data-toggle="tooltip"], #tvbanner [data-toggle="tooltip"], #cher-modal [data-toggle="tooltip"]')
    : []

  if (tooltips.length || dateswitch.length) {
    import('https://esm.archive.org/bootstrap@^3.0.0').then(() => {
      if (tooltips.length)
        tooltips.tooltip({})

      dateswitch.each((_idx, e) => AJS.date_switcher(JSON.parse($(e).val())))
    })
  }


  onclick('.js-createclick', (e) => { location.href = '/create/' })
  onclick('.js-colclick', (e) => {
    const $e = $(e.currentTarget)
    const id = $e.attr('data-id')

    // TV home page uses `__id_` (fake) prefixes for the ID for certain off-site tiles
    const href = id && !id.startsWith('__id_') ? `/details/${id}` : $e.find('a').attr('href')

    // *NORMALLY* clicking on a collection tile goes to it.
    // BUT NOT:
    //   * in lists mode (only the identifier link does that -- not other data columns!)
    //   * if in process of removing items (eg: from favorites list)
    if (id  &&  $('body').hasClass('tiles')  &&  !$e.hasClass('manage-item'))
      location.href = href
  })

  onclick('.js-note', (e) => AJS.editNote(e.currentTarget))

  onclick('.js-inliner', (e) => {
    if (window.inlined)
      return
    window.inlined = true

    const href = `${e.currentTarget.href}&nochrome=1`
    const appendPageContentsHere = $(e.currentTarget).parent().parent().parent()
    appendPageContentsHere.append(
      '<div id="loadin" style="padding:50px"><hr/><h4><img src="/images/loading.gif"/> loading...</h4><hr/></div>',
    )

    $.get(href, (htm) => {
      $('#loadin').remove()
      appendPageContentsHere.append(`<hr/>${htm}`)
    })
  })

  onclick('.js-auto-submit-perpetual', () => {
    document.getElementById('timeout_row').style.display = 'table-row'
    document.getElementById('loopsleep_row').style.display = 'table-row'
    document.getElementById('discard_itemlists_row').style.display = 'table-row'

    document.getElementById('timeout_row').classList.toggle('hidden')
    document.getElementById('loopsleep_row').classList.toggle('hidden')
    document.getElementById('discard_itemlists_row').classList.toggle('hidden')
  }, 'default')

  onchange('.js-auto-submit-cmd', (e) => {
    if (e.currentTarget.value === 'delete.php') {
      // eslint-disable-next-line no-alert
      alert(`
        WARNING: The "lost_item" arg is automatically
        added to delete.php tasks submitted through this form.
        That means the command can be used only to
        tidy our records for items that have already
        gotten lost, not to delete existing items.
        If run on an item that actually exists still,
        the task will redrow.`)
    }
  })

  onclick('.js-slide-toggle', (e) => $($(e.currentTarget).data().target).slideToggle())

  onclick('.js-ajs-deadlists', (e) => {
    const { href } = e.currentTarget
    window.open(
      href,
      'popup',
      'width=800,height=600,scrollbars=yes,resizable=yes,toolbar=no,directories=no,location=no,menubar=no,status=no',
    )
  })

  onclick('.show-more-button', (e) => {
    $('.metadata-hidden').slideToggle('fast');
    $(e.currentTarget).find('.show-more-button__text').toggle();
  });

  // expand downloadable files
  onclick('.js-archive-expand_files', (e) => {
    const element = $(e.currentTarget)
    const id = element.data('id')
    if (id) {
      AJS.quick_down(id, element)
    }
  })

  // collapse downloadable files
  onclick('.js-archive-collapse_files', (e) => {
    const element = $(e.currentTarget)
    const id = element.data('id')
    if (id) {
      AJS.quick_down(id)
    }
  })

  onclick('.js-display-reviews', (e) => {
    $('.details-reviews-list').show();
    $('.display-reviews-msg').hide();
  });

  onclick('.js-reviews-deleteReview', (e) => {
    // eslint-disable-next-line no-alert
    if (confirm('Are you sure you want to delete this review?')) {
      const url = $(e.currentTarget).attr('href');
      if (url) {
        $.ajax({
          type: 'POST',
          url,
        });

        // Replace the review body for the deleted review
        $(e.currentTarget)
          .parent()
          .children('.review-body')
          .html('<span class="deleted-review-msg">This review has been queued for deletion.</span>');
      }
    }
  });

  // Expand selected review
  onclick('.js-reviews-expandReview', (e) => {
    const parentReview = $(e.currentTarget).closest('.aReview');

    parentReview.find('.truncated-msg').hide();
    parentReview.find('.remainder').show();
  });

  // Collapse selected review
  onclick('.js-reviews-collapseReview', (e) => {
    const parentReview = $(e.currentTarget).closest('.aReview');

    parentReview.find('.truncated-msg').show();
    parentReview.find('.remainder').hide();
  })

  // remove bookmarks/favorites from /bookmarks.php page
  onclick('.js-bookmark-removeBookmark', (e) => {
    // eslint-disable-next-line no-alert
    if (confirm('Are you sure you want to delete this favorite?')) {
      const url = $(e.currentTarget).attr('href');
      if (url) window.location = url
    }
  });

  onclick('.js-bookmarks-addCommentForm', (e) => {
    const identifier = $(e.currentTarget).attr('identifier')
    const action = $(e.currentTarget).attr('action')

    const cancelCommentField = () => {
      const formElement = document.getElementById(`${identifier}_form`)
      formElement.parentNode.removeChild(formElement)

      const linkObject = document.getElementById(`${identifier}_commentLink`)
      linkObject.style.display = ''

      const existingComment = document.getElementById(`${identifier}_existingComment`)
      if (existingComment)
        existingComment.style.display = ''
    }

    const formElement = document.createElement('form')
    formElement.action = action
    formElement.method = 'post'
    formElement.id = `${identifier}_form`
    formElement.style.margin = '0'
    formElement.style.fontSize = '12px'
    formElement.appendChild(document.createTextNode('Comment: '))

    const textBox = document.createElement('input')
    textBox.name = 'add_comment'
    textBox.type = 'text'
    if (document.getElementById(`${identifier}_existingCommentText`))
      textBox.value = document.getElementById(`${identifier}_existingCommentText`).innerHTML
    formElement.appendChild(textBox)

    const idField = document.createElement('input')
    idField.name = 'identifier'
    idField.type = 'hidden'
    idField.value = identifier
    formElement.appendChild(idField)

    const goButton = document.createElement('input')
    goButton.name = 'submit'
    goButton.type = 'submit'
    goButton.value = 'Save'
    formElement.appendChild(goButton)

    const cancelButton = document.createElement('input')
    cancelButton.type = 'button'
    cancelButton.id = `${identifier}_cancelButton`
    cancelButton.rel = identifier
    cancelButton.onclick = cancelCommentField
    cancelButton.value = 'Cancel'
    formElement.appendChild(cancelButton)

    document.getElementById(`${identifier}_formSpan`).appendChild(formElement)

    const linkObject = document.getElementById(`${identifier}_commentLink`)
    linkObject.style.display = 'none'

    const existingComment = document.getElementById(`${identifier}_existingComment`)
    if (existingComment)
      existingComment.style.display = 'none'
  })

  // For useradmin.php
  // Copy emails to clipboard
  const clipboardButton = document.querySelector('#js-useradmin-clipboard')
  if (clipboardButton) {
    clipboardButton.addEventListener('click', (e) => {
      const emails = Array.from(document.querySelectorAll('.js-useradmin-username'))
        .map((element) => element.textContent)
        .join(' ')
      navigator.clipboard.writeText(emails)
    })
  }

  const searchForm = document.querySelector('.js-useradmin-search')
  if (searchForm) {
    // Disable empty inputs for clean GET querystring
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault()
      Array.from(searchForm.querySelectorAll('input'))
        .filter((element) => !element.value)
        .forEach((element) => {
          const inputCopy = element
          inputCopy.disabled = true
        })
      searchForm.submit()
    })

    // Clear disabled inputs on page load
    Array.from(searchForm.querySelectorAll('input'))
      .forEach((element) => {
        const inputCopy = element;
        inputCopy.disabled = false;
      })
  }
  // End for useradmin.php

  // For details.inc
  // Can be used for any element with text that needs to be clamped/unclamped
  // Presence/absence of clampedClass can be used to show/hide a "more/less" button/checkbox
  // @see www/sf/includes/less/partials/item-details-metadata.less
  // Check if any texts are clamped and set clamped class
  const clampableElements = $('.js-clamp')
  const clampedClass = 'clamped'

  if (clampableElements.length) {
    clampableElements.each((index, element) => {
      // isTextClamped() only works on element with text, not starting at any parent
      if (AJS.isTextClamped(element)) {
        element.classList.add(clampedClass)
        AJS.bindClampCheckbox(element)
      }
    })

    // Listen for window resize and re-check if any texts are now clamped
    window.addEventListener('resize', debounce(() => {
      clampableElements.each((index, element) => {
        if (AJS.isTextClamped(element)) {
          // No-op if already set
          element.classList.add(clampedClass)
          AJS.bindClampCheckbox(element)
        } else {
          AJS.unbindClampCheckbox(element)
          element.classList.remove(clampedClass)
        }
      })
    }), 50)
  }
  // End for details.inc
})

window.AJS = AJS  // promote to global (for inline JS in emitted markup from PHP mostly)

export { AJS as default }
