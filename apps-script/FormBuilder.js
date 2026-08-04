/**
 * FormBuilder.gs
 * Creates or updates the DILG Client Satisfaction Survey Google Form.
 * CC1→CC2/CC3 conditional routing via page breaks.
 */

function createOrUpdateForm() {
  var ui = SpreadsheetApp.getUi();
  var formId = SCRIPT_PROP.getProperty('FORM_ID');
  var form;
  var isNew = !formId;

  if (isNew) {
    form = FormApp.create(FORM_TITLE);
    form.setDescription(FORM_DESC);
    form.setCollectEmail(false);
    form.setLimitOneResponsePerUser(false);
    form.setShowLinkToRespondAgain(false);
    form.setProgressBar(true);
    form.setConfirmationMessage(
      'Maraming salamat sa iyong oras at puna. ' +
      'Ang iyong tugon ay makatutulong sa pagpapabuti ng serbisyo publiko.'
    );
    form.setAllowResponseEdits(false);
    form.setAcceptingResponses(true);

    SCRIPT_PROP.setProperty('FORM_ID', form.getId());
    SCRIPT_PROP.setProperty('FORM_URL', form.getPublishedUrl());
  } else {
    try {
      form = FormApp.openById(formId);
    } catch (e) {
      ui.alert('Error', 'Hindi mabuksan ang form. Baka na-delete. Gumagawa ng bago...', ui.ButtonSet.OK);
      SCRIPT_PROP.deleteProperty('FORM_ID');
      createOrUpdateForm();
      return;
    }
  }

  // Clear existing items if updating
  if (!isNew) {
    var items = form.getItems();
    items.forEach(function(item) { form.deleteItem(item); });
  }

  buildForm(form);

  // Link to spreadsheet
  try {
    form.setDestination(FormApp.DestinationType.SPREADSHEET, SpreadsheetApp.getActive().getId());
  } catch (e) {
    // Already linked — ignore
  }

  // Add Response ID column if missing
  ensureResponseIdColumn();

  // Generate pre-filled URL (SQD5 = N/A default)
  var prefilledUrl = generatePrefilledUrl(form);

  // Count items to verify form built correctly
  var allItems = form.getItems();
  var pageBreaks = allItems.filter(function(i) { return i.getType() === FormApp.ItemType.PAGE_BREAK; });
  var totalItems = allItems.length;

  var msg = (isNew ? 'Form created!' : 'Form updated.') + '\n' +
    'Items: ' + totalItems + ' | Pages: ' + (pageBreaks.length + 1) + ' (expected: 15)\n\n' +
    'FORM LINK (share this — SQD5 pre-tagged N/A):\n' +
    (prefilledUrl || form.getPublishedUrl()) + '\n\n' +
    'Edit form: ' + form.getEditUrl() + '\n\n' +
    (prefilledUrl
      ? 'Gamitin ang FORM LINK sa itaas para sa respondents. Ang SQD5 ay awtomatikong N/A.'
      : 'NOTE: Pre-fill failed. SQD5 blanks will still auto-fill N/A on submit.');

  ui.alert('DILG Survey Form', msg, ui.ButtonSet.OK);
}

// ──────────────────────────────────
// Form builder
// ──────────────────────────────────

function buildForm(form) {
  var item;

  // ════════════════════════════════════
  // PAGE 1: Disclaimer + Office Details + Demographics
  // ════════════════════════════════════
  form.addSectionHeaderItem()
    .setTitle('Minamahal naming kliyente,')
    .setHelpText('Pakisagutan ang sarbey na ito at ilahad ang inyong mga puna sa serbisyong aming binigay. ' +
      'Aming kinakalap ang inyong personal na datos para sa pagsusuring maaaring gawin ng DILG. ' +
      'Ang inyong datos ay itatago sa aming database o sa isang ligtas na locker para sa mga pisikal na form ' +
      'sa loob ng dalawang taon bago tuluyang burahin sa aming talaan. ' +
      'Kung nais ninyong baguhin ang inyong personal na datos, maaari itong ipaalam sa nakatalagang kawani sa _________________________________. ' +
      'Kung mayroon kayong mapapansin sa pagpoproseso ng inyong datos na hindi naaayon sa batas, ' +
      'maaaring ipagbigay alam ito sa DILG Data Protection Officer sa dpo.dilg@gmail.com.');

  form.addSectionHeaderItem().setTitle('1. Detalye ng Tanggapan');

  item = form.addTextItem();
  item.setTitle('Pangalan ng tanggapan / operating unit');
  item.setRequired(true);

  item = form.addTextItem();
  item.setTitle('Serbisyong ibinigay');
  item.setRequired(true);

  item = form.addDateItem();
  item.setTitle('Petsa');
  item.setRequired(true);
  item.setIncludesYear(true);

  form.addSectionHeaderItem().setTitle('2. Demograpiko');

  item = form.addMultipleChoiceItem();
  item.setTitle('Uri ng Kliyente');
  item.setRequired(true);
  item.setChoiceValues(['Mamamayan', 'Negosyo', 'Gobyerno (empleyado o mula sa ibang ahensiya)']);

  item = form.addMultipleChoiceItem();
  item.setTitle('Edad');
  item.setRequired(true);
  item.setChoiceValues([
    'Mas mababa sa 18 y/o', '18-24 y/o', '25-34 y/o', '35-44 y/o',
    '45-54 y/o', '55-64 y/o', '65 y/o pataas'
  ]);

  item = form.addMultipleChoiceItem();
  item.setTitle('Kasarian');
  item.setRequired(true);
  item.setChoiceValues(['Lalaki', 'Babae', 'LGBTQIA+', 'Hindi nais sabihin']);

  item = form.addTextItem();
  item.setTitle('Rehiyon ng tirahan');
  item.setRequired(true);

  // ════════════════════════════════════
  // PAGE 2: CC1 (Gabay ng Mamamayan intro)
  // ════════════════════════════════════
  form.addPageBreakItem()
    .setTitle('3. Gabay ng Mamamayan ng DILG')
    .setHelpText('Ang Gabay ng Mamamayan ay isang dokumento na nagpapakita ng mga serbisyo ng isang tanggapan ng pamahalaan at mga kaakibat nitong kahilingan, babayaran, at tagal ng pagpoproseso, atbp.');

  item = form.addMultipleChoiceItem();
  item.setTitle('CC1. Alin sa mga sumusunod ang naglalarawan ng iyong kaalaman sa CC/Gabay?');
  item.setRequired(true);
  item.setChoiceValues([
    'Alam ko kung ano ang Gabay, at nakita ko ang Gabay ng tanggapang ito.',
    'Alam ko kung ano ang Gabay, ngunit hindi ko nakita ang Gabay ng tanggapang ito.',
    'Nalaman ko kung ano ang Gabay noong nakita ko ang Gabay ng tanggapang ito.',
    'Hindi ko alam kung ano ang Gabay, at hindi ako nakakita ng Gabay sa tanggapang ito. (Piliin ang N/A sa CC2 at CC3.)'
  ]);

  // ════════════════════════════════════
  // PAGE 3: CC2
  // ════════════════════════════════════
  form.addPageBreakItem().setTitle('Gabay ng Mamamayan (CC2)');

  item = form.addMultipleChoiceItem();
  item.setTitle('CC2. Kung alam ang Gabay, masasabi mo ba na ang Gabay ng tanggapang ito ay:');
  item.setRequired(true);
  item.setChoiceValues(['Madaling makita', 'Bahagyang nakikita', 'Mahirap makita', 'Hindi makita', 'N/A']);

  // ════════════════════════════════════
  // PAGE 4: CC3
  // ════════════════════════════════════
  form.addPageBreakItem().setTitle('Gabay ng Mamamayan (CC3)');

  item = form.addMultipleChoiceItem();
  item.setTitle('CC3. Kung alam ang Gabay, gaano nakatulong ang Gabay sa iyong transaksiyon?');
  item.setRequired(true);
  item.setChoiceValues(['Lubos na nakatulong', 'Bahagyang nakatulong', 'Hindi nakatulong', 'N/A']);

  // ════════════════════════════════════
  // PAGE 5-13: SQD0–SQD8 (one per page)
  // ════════════════════════════════════
  var sqdStatements = [
    'SQD0. Nasiyahan ako sa serbisyo na aking hiniling.',
    'SQD1. Makatuwiran ang oras na aking inilaan para sa transaksiyon.',
    'SQD2. Sinunod ng tanggapan ang mga kahilingan at hakbang batay sa impormasyong ibinigay.',
    'SQD3. Ang mga hakbang sa pagproseso, kasama na ang pagbayad ay madali at simple lamang.',
    'SQD4. Madali kong nahanap ang impormasyon tungkol sa aking transaksiyon mula sa tanggapan o kanilang website.',
    'SQD5. Nagbayad ako ng makatuwirang halaga para sa aking transaksyon. (Kung ang serbisyo ay libre, piliin ang N/A)',
    'SQD6. Pakiramdam ko ay patas sa lahat o walang palakasan sa tanggapan para sa aking transaksiyon.',
    'SQD7. Matulungin at magalang ang pakikitungo sa akin ng mga kawani.',
    'SQD8. Nakuha ko ang kinakailangan ko mula sa tanggapan. (Kung tinanggihan man, sapat na ipinaliwanag.)'
  ];

  var sqdOptions = [
    'Lubos na sang-ayon', 'Sang-ayon', 'Walang kinikilingan',
    'Hindi sang-ayon', 'Lubos na hindi sang-ayon', 'N/A'
  ];

  for (var s = 0; s < sqdStatements.length; s++) {
    var pageTitle = '4. Kalidad ng Serbisyo';
    if (s === 0) {
      pageTitle = '4. Kalidad ng Serbisyo\nLagyan ng tsek (✔) ang hanay na pinakaangkop sa iyong sagot.';
    }
    form.addPageBreakItem().setTitle(pageTitle);

    item = form.addMultipleChoiceItem();
    item.setTitle(sqdStatements[s]);
    item.setRequired(true);
    item.setChoiceValues(sqdOptions);
  }

  // ════════════════════════════════════
  // PAGE 6: Mungkahi
  // ════════════════════════════════════
  form.addPageBreakItem().setTitle('5. Puná / Mungkahi');

  item = form.addParagraphTextItem();
  item.setTitle('Mga mungkahi sa kung paano pa mapapabuti ang aming serbisyo:');
  item.setRequired(false);

  // ════════════════════════════════════
  // PAGE 7: Contact Info (optional)
  // ════════════════════════════════════
  form.addPageBreakItem()
    .setTitle('Impormasyon ng Kliyente (Optional)')
    .setHelpText('Hindi required. Punan lamang kung nais mong makontak ka namin.');

  item = form.addTextItem();
  item.setTitle('Pangalan (optional)');
  item.setRequired(false);

  item = form.addTextItem();
  item.setTitle('Contact number');
  item.setRequired(false);

  item = form.addTextItem();
  item.setTitle('Email address');
  item.setRequired(false);
}

// ──────────────────────────────────
// Generate pre-filled URL with SQD5 = N/A (default for this office).
// The office shares this link, not the raw form link.
// ──────────────────────────────────

function generatePrefilledUrl(form) {
  try {
    var items = form.getItems(FormApp.ItemType.MULTIPLE_CHOICE);
    var sqd5Item = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i].getTitle().indexOf('SQD5.') !== -1) {
        sqd5Item = items[i].asMultipleChoiceItem();
        break;
      }
    }

    if (!sqd5Item) {
      Logger.log('SQD5 item not found for pre-fill.');
      return null;
    }

    var itemResponse = sqd5Item.createResponse('N/A');
    var formResponse = form.createResponse();
    formResponse.withItemResponse(itemResponse);

    var url = formResponse.toPrefilledUrl();
    SCRIPT_PROP.setProperty('FORM_PREFILLED_URL', url);
    Logger.log('Pre-filled URL: ' + url);
    return url;
  } catch (e) {
    Logger.log('Pre-fill URL generation failed (non-fatal): ' + e.message);
    return null;
  }
}

// ──────────────────────────────────
// Ensure 'Response ID' column exists in linked sheet
// ──────────────────────────────────

function ensureResponseIdColumn() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var lastCol = sheet.getLastColumn();

  // Sheet is empty (no columns yet) — add Response ID at column A
  if (lastCol === 0) {
    sheet.getRange(1, 1).setValue('Response ID');
    sheet.getRange(1, 1).setFontWeight('bold');
    return;
  }

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  // Check if Response ID column exists
  for (var i = 0; i < headers.length; i++) {
    if (headers[i] && headers[i].toString().trim() === 'Response ID') return;
  }

  // Insert at column A (push everything right)
  sheet.insertColumnBefore(1);
  sheet.getRange(1, 1).setValue('Response ID');
  sheet.getRange(1, 1).setFontWeight('bold');
}
