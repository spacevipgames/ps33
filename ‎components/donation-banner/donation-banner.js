/* eslint-disable class-methods-use-this */
/* eslint-disable no-console */
import Cookies from 'https://esm.archive.org/js-cookie';
import Snowflakes from 'https://esm.archive.org/magic-snowflakes@^6.0.0';

import 'https://esm.archive.org/@internetarchive/donation-form-edit-donation@^1.1.3';
import 'https://esm.archive.org/@internetarchive/donation-banner-thermometer@^0.4.3';
import { IASharedRO as SharedResizeObserver } from '../ia-shared-resizeobserver/ia-shared-resizeobserver.js';

// eslint-disable-next-line import/no-named-as-default
import $ from '../util/jquery.js';
import DonationBannerIframeHandler from './donation-banner-iframe-handler.js';
import AnalyticsHandler from '../analyticsHandler/analyticsHandler.js';
import RemindForm from './remind_form.js';

console?.log('donation-banner loaded', {
  version: '1.1.1',
});

class DonationBanner {
  addCloseSupport() {
    const bannerClose = function hideDonationBannerOnClickingXbutton() {
      // set a cookie to make the donate banner not show for 6 weeks..
      const daysToHideBanner = 42;
      DonationBannerIframeHandler.postMessage('hide banner', daysToHideBanner); // nixxx lines below & relateds, once iframe used by IA
      this.bannerElement.style.display = 'none';
      this.logEvent('CloseClicked', true);
      this.setDonationCookie(daysToHideBanner);
    };

    const closeButton = document.getElementById('donate-close-button');
    if (closeButton)
      closeButton.addEventListener('click', bannerClose.bind(this));
  }

  initialize() {
    if (!this.bannerElement) return;
    this.donationInfoError = false;
    this.addCloseSupport();
    this.setupDonationForm();
    this.setupThermometer();
    this.setupMinimalDonateButton();
    this.setupSnow();
    DonationBannerIframeHandler.init();
    const remindForm = new RemindForm(
      $('#donate_reminder_form'),
      $('#donate_later'),
      this.setDonationCookie,
    );
    remindForm.setup();

    this.logEvent('Viewed');
  }

  setDonationCookie(expires) {
    DonationBanner.setDonationCookie(expires);
    DonationBannerIframeHandler.postMessage('set cookie', expires);
  }

  get bannerElement() {
    return document.querySelector('#donate_banner');
  }

  get donationFormElement() {
    return document.querySelector('donation-form-edit-donation');
  }

  get bannerThermometerElement() {
    return document.querySelector('donation-banner-thermometer');
  }

  get minimalDonateButtonElement() {
    return document.querySelector('#minimal-donate-button');
  }

  get donationOrigin() {
    const banner = this.bannerElement;
    const experimentName = banner.dataset.exp;
    const variantName = banner.dataset.variant;
    let currentWindowWidth;
    try {
      currentWindowWidth = window.parent.innerWidth;
    } catch (e) {
      currentWindowWidth = DonationBannerIframeHandler.currentWindowWidth;
    }
    const responsiveMode = currentWindowWidth < 768 ? 'Mobile' : 'Desktop';
    const origin = `DonateBanner-${experimentName}-${variantName}-${responsiveMode}`;
    console.log('PSA Donation Banner donationOrigin: ', {
      responsiveMode,
      currentWindowWidth,
      origin,
    });
    return origin;
  }

  /*
   * Sets a cookie to indicate that a donation transaction has completed.
   * @param {number} daysCookieWillExpire
   */
  static setDonationCookie(daysCookieWillExpire) {
    // using js-cookie library
    const expires = parseInt(daysCookieWillExpire, 10);
    if (!expires) return;

    const cookie = {
      path: '/',
      expires,
      domain: '.archive.org',
    };

    Cookies.set('donation', 'x', cookie);
    Cookies.set('donation', 'x', $.extend(cookie, { domain: '.openlibrary.org' }));
  }

  setupSnow() {
    if (this.bannerElement.dataset.snowfall !== 'on') return;
    const snowflakes = new Snowflakes({
      container: document.querySelector('#donate-body-background-layer2'),
      count: 100,
      minOpacity: 0.08,
      maxOpacity: 0.15,
      minSize: 4,
      maxSize: 8,
      rotation: true,
      speed: 0.15,
    });
    snowflakes.start();
  }

  setupMinimalDonateButton() {
    const donateButton = this.minimalDonateButtonElement;
    if (!donateButton) return;

    donateButton.addEventListener('click', () => {
      this.logEvent('MinimalDonateButtonClicked');
      // We only want to set the donation cookie when the user clicks "Continue" if the
      // user is seeing the iframe version. We can't set a donation cookie on non-archive.org
      // domains so if they make a donation, then go back, they'll see the banner again.
      DonationBannerIframeHandler.postMessage('set cookie', 30);
      window.top.location = this.baseDonatePageUrl;
    });
  }

  get baseDonatePageUrl() {
    const banner = this.bannerElement;
    const baseUrl = banner.dataset.baseurl;
    const donationSourceData = banner.dataset.donationsourcedata;
    const variantDollarAmounts = banner.dataset.variantdollaramounts;
    const variantAmountLayout = banner.dataset.variantamountlayout;
    const variantFrequencyMode = banner.dataset.variantfrequencymode;
    const bannerTemplate = banner.dataset.bannertemplate;
    const { platform } = banner.dataset;

    // eslint-disable-next-line compat/compat
    const searchParams = new URLSearchParams();
    if (this.donationOrigin) {
      searchParams.set('origin', this.donationOrigin);
    }
    if (donationSourceData) {
      searchParams.set('referer', donationSourceData);
    }
    if (variantDollarAmounts) {
      searchParams.set('dollarAmounts', variantDollarAmounts);
    }
    if (variantAmountLayout) {
      searchParams.set('amountLayout', variantAmountLayout);
    }
    if (variantFrequencyMode) {
      searchParams.set('frequencyMode', variantFrequencyMode);
    }
    if (platform) {
      searchParams.set('platform', platform);
    }
    if (bannerTemplate) {
      searchParams.set('bannerTemplate', bannerTemplate);
    }
    const url = `${baseUrl}/donate?${searchParams.toString()}`;
    return url;
  }

  setupDonationForm() {
    const editDonationForm = this.donationFormElement;
    if (!editDonationForm) return;

    let { donationInfo } = editDonationForm;
    const isPsaBanner = this.bannerElement.classList.contains('formdesign-psa');
    if (isPsaBanner) {
      // get link
      const ctaButton = document.querySelector('#psa-cta');
      console.log('PSA Donation Banner CTA: ', ctaButton);
      if (!ctaButton) return;
      ctaButton.addEventListener('click', (event) => {
        // send patron to donate page
        const url = `${this.baseDonatePageUrl}&amt=${donationInfo.amount}`;
        this.logEvent('ContinueClicked');
        this.setDonationCookie(3);
        console?.log('donationInfoChanged - IN minimal banner check - post cookie', { url });
        window.top.location = url;
      });

      return;
    }

    editDonationForm.addEventListener('donationInfoChanged', (event) => {
      this.donationInfoError = false;
      donationInfo = event.detail.donationInfo;

      const isMinimalBanner = this.bannerElement.classList.contains('formdesign-minimal');

      console?.log('donationInfoChanged', {
        isMinimalBanner,
        ...donationInfo,
      });

      // check if minimal
      if (isMinimalBanner) {
        // send patron to donate page
        const url = `${this.baseDonatePageUrl}&amt=${donationInfo.amount}`;
        this.logEvent('ContinueClicked');
        this.setDonationCookie(3);
        console?.log('donationInfoChanged - IN minimal banner check - post cookie', { url });
        window.top.location = url;
      }
    });

    editDonationForm.addEventListener('editDonationError', (event) => {
      this.donationInfoError = true;
    });

    const continueButton = document.querySelector('#continue-button');
    if (!continueButton) {
      return;
    }
    continueButton.addEventListener('click', () => {
      if (this.donationInfoError) return;

      this.logEvent('ContinueClicked');
      const bannerDataSet = this.bannerElement.dataset;

      let customSelectedTextColor = bannerDataSet.selectedtextcolor
        ? `&selectedTextColor=${encodeURIComponent(bannerDataSet.selectedtextcolor)}`
        : '';
      let customSelectedFillColor = bannerDataSet.selectedfillcolor
        ? `&selectedFillColor=${encodeURIComponent(bannerDataSet.selectedfillcolor)}`
        : '';
      /* allow for override to custom selected option colors for donate bage */
      if (bannerDataSet.donatepageselectedfillcolor) {
        customSelectedFillColor = `&selectedFillColor=${encodeURIComponent(bannerDataSet.donatepageselectedfillcolor)}`;
      }
      if (bannerDataSet.donatepageselectedtextcolor) {
        customSelectedTextColor = `&selectedTextColor=${encodeURIComponent(bannerDataSet.donatepageselectedtextcolor)}`;
      }

      const customFormTextColor = bannerDataSet.formtextcolor
        ? `&formTextColor=${encodeURIComponent(bannerDataSet.formtextcolor)}`
        : '';

      const url = `${this.baseDonatePageUrl}&amt=${donationInfo.amount}&contrib_type=${donationInfo.donationType}&coverFees=${donationInfo.coverFees}${customSelectedTextColor}${customSelectedFillColor}${customFormTextColor}`;
      // We only want to set the donation cookie when the user clicks "Continue" if the
      // user is seeing the iframe version. We can't set a donation cookie on non-archive.org
      // domains so if they make a donation, then go back, they'll see the banner again.
      DonationBannerIframeHandler.postMessage('set cookie', 30);
      window.top.location = url;
    });
  }

  setupThermometer() {
    const thermometerElement = this.bannerThermometerElement;
    if (!thermometerElement) return;

    const resizeObserver = new SharedResizeObserver();
    thermometerElement.resizeObserver = resizeObserver;
  }

  logEvent(eventAction, sendAsSampledEvent = false) {
    const analyticsHandler = new AnalyticsHandler();
    const banner = this.bannerElement;
    const debugMode = banner.dataset.debugmode === 'true';
    const { platform } = banner.dataset;
    const eventName = debugMode ? 'DonateBannerDebug' : 'DonateBanner';

    // The `Viewed` event is very noisy so we want to sample the calls for IA and WB
    // because even sampled, we can still extrapolate actual values, but OL traffic
    // is too low to extrapolate values. For all other events, we want them without
    // sampling so we get accurate numbers.
    if (sendAsSampledEvent || (eventAction === 'Viewed' && (platform === 'ia' || platform === 'wb'))) {
      analyticsHandler.send_event(eventName, eventAction, this.donationOrigin);
    } else {
      analyticsHandler.send_event_no_sampling(
        eventName,
        eventAction,
        this.donationOrigin,
      );
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const donationBanner = new DonationBanner();
  donationBanner.initialize();
});
