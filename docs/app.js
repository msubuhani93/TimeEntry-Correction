(function () {
  'use strict';

  const MAX_CSV_SIZE_MB = 50;
  const MAX_CSV_BYTES = MAX_CSV_SIZE_MB * 1024 * 1024;

  const form = document.getElementById('timeCorrectionForm');
  const country = document.getElementById('country');
  const requestType = document.getElementById('requestType');
  const csvDropZone = document.getElementById('csvDropZone');
  const csvFileInput = document.getElementById('csvFile');
  const browseCsvBtn = document.getElementById('browseCsv');
  const csvFileName = document.getElementById('csvFileName');
  const documentName = document.getElementById('documentName');
  const approvalEmail = document.getElementById('approvalEmail');
  const submitValidationBtn = document.getElementById('submitValidation');
  const cancelBtn = document.getElementById('cancelBtn');
  const createRequestBtn = document.getElementById('createRequestBtn');
  const formModal = document.getElementById('formModal');
  const modalOverlay = document.getElementById('modalOverlay');
  const dashboardBody = document.getElementById('dashboardBody');
  const dashboardEmpty = document.getElementById('dashboardEmpty');
  const exportBtn = document.getElementById('exportBtn');
  const toast = document.getElementById('toast');

  let nextRequestId = 124;
  let editingRequestId = null;
  const requests = [];

  function getStatusType(req) {
    if (req.stage === 'Error') return 'failed';
    if (req.stage === 'File Validation Complete' && req.status && req.status.toLowerCase().indexOf('email') >= 0) return 'failed';
    if (req.stage === 'File Validation in progress' || req.stage === 'Pending Approval' ||
        req.stage === 'File Processing In progress' || req.stage === 'WBS not Open' ||
        req.stage === 'File Uploaded in Swift') return 'in_progress';
    return 'completed';
  }

  function getStageClass(req) {
    var t = getStatusType(req);
    if (t === 'failed') return 'stage-error';
    if (t === 'in_progress') return 'stage-inprogress';
    return 'stage-success';
  }

  function canEnableBrowse() {
    return (country.value && country.value.trim() !== '') &&
           (requestType.value && requestType.value.trim() !== '');
  }

  function updateBrowseCsvState() {
    browseCsvBtn.disabled = !canEnableBrowse();
  }

  function updateSubmitState() {
    submitValidationBtn.disabled = !(csvFileInput.files && csvFileInput.files.length > 0);
  }

  function formatDate(d) {
    d = d || new Date();
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, ' ');
  }

  function formatTime(d) {
    d = d || new Date();
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }

  function addRequest(stage, status, numberRecords, impactedRecords, requestedBy, createdOn, createdTime, updatedBy, updatedOn, serviceNowLink, failureRitm, detailsText, detailsHref, countryCode, stageHistory) {
    var requestId = String(nextRequestId++).padStart(8, '0');
    var stages = stageHistory && stageHistory.length ? stageHistory : [stage || ''];
    var req = {
      requestId: requestId,
      country: countryCode || '',
      stage: stage || '',
      status: status || '',
      numberRecords: numberRecords != null ? numberRecords : '',
      impactedRecords: impactedRecords != null ? impactedRecords : '',
      requestedBy: requestedBy || 'Current User',
      createdOn: createdOn || formatDate(),
      createdTime: createdTime || formatTime(),
      updatedBy: updatedBy || '',
      updatedOn: updatedOn || '',
      serviceNowLink: serviceNowLink || '',
      failureRitm: failureRitm || '',
      detailsText: detailsText || '',
      detailsHref: detailsHref || false,
      correctionCount: 0,
      errorMessageColumn: [],
      uploadedFiles: [],
      stageHistory: stages
    };
    requests.push(req);
    renderDashboard();
    return req;
  }

  function seedTestData() {
    var baseDate = new Date();
    var d1 = new Date(baseDate);
    d1.setDate(d1.getDate() - 2);
    var d2 = new Date(baseDate);
    d2.setDate(d2.getDate() - 1);

    var hist = {
      validation: ['File Validation in progress'],
      validationComplete: ['File Validation in progress', 'File Validation Complete'],
      uploaded: ['File Validation in progress', 'File Validation Complete', 'File Uploaded in Swift'],
      pending: ['File Validation in progress', 'File Validation Complete', 'File Uploaded in Swift', 'Pending Approval'],
      wbsNotOpen: ['File Validation in progress', 'File Validation Complete', 'File Uploaded in Swift', 'WBS not Open'],
      processing: ['File Validation in progress', 'File Validation Complete', 'File Uploaded in Swift', 'File Processing In progress'],
      error: ['File Validation in progress', 'File Validation Complete', 'File Uploaded in Swift', 'File Processing In progress', 'Error'],
      completed: ['File Validation in progress', 'File Validation Complete', 'File Uploaded in Swift', 'File Processing In progress', 'Completed'],
      acknowledged: ['File Validation in progress', 'File Validation Complete', 'File Uploaded in Swift', 'File Processing In progress', 'Completed', 'Acknowledged']
    };

    addRequest('File Validation in progress', '', 1000, 1000, 'John Smith', formatDate(d1), '09:15:00', '', '', '', '', '', false, 'AU', hist.validation);
    addRequest('File Validation Complete', 'Email Trigger to requestor', 500, 12, 'Jane Doe', formatDate(d1), '11:22:00', 'System', formatDate(d2), '', '', '', false, 'IN', hist.validationComplete);
    addRequest('File Uploaded in Swift', '', 800, 800, 'Alice Brown', formatDate(d2), '14:05:00', '', '', '', '', '', false, 'AU', hist.uploaded);
    addRequest('Pending Approval', '', 1200, 1200, 'Bob Wilson', formatDate(d2), '16:30:00', '', '', '', '', '', false, 'IN', hist.pending);
    addRequest('WBS not Open', '', 600, 45, 'Carol Lee', formatDate(d1), '10:00:00', '', '', '', 'RITM8200735', '', false, 'AU', hist.wbsNotOpen);
    addRequest('File Processing In progress', '', 750, 750, 'John Smith', formatDate(d2), '08:45:00', '', '', '', '', '', false, 'IN', hist.processing);
    addRequest('Error', '', 300, 8, 'Jane Doe', formatDate(d1), '13:10:00', 'System', formatDate(d2), '', '', 'Details', true, 'AU', hist.error);
    addRequest('Completed', '', 2000, 2000, 'Alice Brown', formatDate(d1), '09:00:00', 'System', formatDate(d2), 'https://example.com/sn/123', '', 'Details', true, 'IN', hist.completed);
    addRequest('Acknowledged', '', 950, 950, 'Bob Wilson', formatDate(d2), '15:20:00', 'System', formatDate(baseDate), '', '', 'Details', true, 'AU', hist.acknowledged);

    nextRequestId = 133;
  }

  function renderDashboard() {
    dashboardBody.innerHTML = '';
    if (requests.length === 0) {
      dashboardEmpty.classList.remove('hidden');
      return;
    }
    dashboardEmpty.classList.add('hidden');
    requests.forEach(function (r) {
      var tr = document.createElement('tr');
      var countryDisplay = r.country === 'AU' ? 'Australia (AU)' : r.country === 'IN' ? 'India (IN)' : escapeHtml(r.country);
      var stageClass = getStageClass(r);
      tr.innerHTML =
        '<td class="col-request-id">' +
          '<a href="#" class="link-request-id" data-request-id="' + r.requestId + '">' + r.requestId + '</a>' +
        '</td>' +
        '<td class="col-country">' + countryDisplay + '</td>' +
        '<td class="col-stage stage-cell ' + stageClass + '"><button type="button" class="stage-pill stage-pill-clickable" data-request-id="' + r.requestId + '" title="View stage history">' + escapeHtml(r.stage) + '</button></td>' +
        '<td class="col-status">' + escapeHtml(r.status) + '</td>' +
        '<td class="col-num-records">' + escapeHtml(String(r.numberRecords)) + '</td>' +
        '<td class="col-impacted">' + escapeHtml(String(r.impactedRecords)) + '</td>' +
        '<td class="col-requested-by">' + escapeHtml(r.requestedBy) + '</td>' +
        '<td class="col-created-on">' + escapeHtml(r.createdOn) + '</td>' +
        '<td class="col-service-now">' + (r.serviceNowLink ? '<a href="' + escapeHtml(r.serviceNowLink) + '" class="link-details" target="_blank" rel="noopener">Link</a>' : '') + '</td>' +
        '<td class="col-failure-ritm">' + escapeHtml(r.failureRitm) + '</td>' +
        '<td class="col-files">' + renderFilesCell(r) + '</td>';
      dashboardBody.appendChild(tr);
    });

    dashboardBody.querySelectorAll('.link-request-id').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var id = link.getAttribute('data-request-id');
        var req = requests.find(function (r) { return r.requestId === id; });
        if (!req) return;
        var fileCount = (req.uploadedFiles && req.uploadedFiles.length) || 0;
        if (fileCount >= 2) {
          showToast('Your edits have expired or are limited. We will close this request. Please create a new request.');
          return;
        }
        editingRequestId = req.requestId;
        country.value = req.country || '';
        documentName.value = '';
        approvalEmail.value = '';
        csvFileInput.value = '';
        csvFileName.textContent = '';
        clearValidationMessage(csvDropZone.parentElement);
        updateBrowseCsvState();
        updateSubmitState();
        openFormModal();
        setTimeout(function () { country.focus(); }, 300);
      });
    });

    dashboardBody.querySelectorAll('.link-download-file').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        downloadRequestFile(link.getAttribute('data-request-id'), parseInt(link.getAttribute('data-file-index'), 10));
      });
    });

    dashboardBody.querySelectorAll('.stage-pill-clickable').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        openStageHistoryModal(btn.getAttribute('data-request-id'));
      });
    });
  }

  function openStageHistoryModal(requestId) {
    var req = requests.find(function (r) { return r.requestId === requestId; });
    if (!req) return;
    var container = document.getElementById('stageHistoryTimeline');
    var titleEl = document.getElementById('stageHistoryRequestId');
    titleEl.textContent = 'Request ID: ' + req.requestId;
    container.innerHTML = '';
    var history = req.stageHistory || [req.stage];
    var currentStageClass = getStageClass(req);
    history.forEach(function (s, i) {
      var isLast = i === history.length - 1;
      var step = document.createElement('div');
      step.className = 'timeline-step' + (isLast ? ' timeline-step-current ' + currentStageClass : '');
      step.innerHTML =
        '<div class="timeline-node-wrap">' +
          '<span class="timeline-node" aria-hidden="true"></span>' +
          (i < history.length - 1 ? '<span class="timeline-line" aria-hidden="true"></span>' : '') +
        '</div>' +
        '<div class="timeline-label">' +
          '<span class="timeline-step-num">' + (i + 1) + '</span>' +
          '<span class="timeline-step-name">' + escapeHtml(s) + '</span>' +
        '</div>';
      container.appendChild(step);
    });
    var modal = document.getElementById('stageHistoryModal');
    modal.hidden = false;
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeStageHistoryModal() {
    var modal = document.getElementById('stageHistoryModal');
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(function () { modal.hidden = true; }, 250);
  }

  (function initStageHistoryModal() {
    var overlay = document.getElementById('stageHistoryOverlay');
    var closeBtn = document.getElementById('stageHistoryClose');
    if (overlay) overlay.addEventListener('click', closeStageHistoryModal);
    if (closeBtn) closeBtn.addEventListener('click', closeStageHistoryModal);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.getElementById('stageHistoryModal').classList.contains('is-open')) closeStageHistoryModal();
    });
  })();

  function renderFilesCell(req) {
    if (!req.uploadedFiles || req.uploadedFiles.length === 0) return '—';
    return req.uploadedFiles.map(function (f, i) {
      return '<a href="#" class="link-download-file" data-request-id="' + req.requestId + '" data-file-index="' + i + '">' + escapeHtml(f.label) + '</a>';
    }).join(' · ');
  }

  function downloadRequestFile(requestId, fileIndex) {
    var req = requests.find(function (r) { return r.requestId === requestId; });
    if (!req || !req.uploadedFiles || !req.uploadedFiles[fileIndex]) return;
    var f = req.uploadedFiles[fileIndex];
    var name = req.requestId + '_' + f.label.replace(/\s+/g, '_') + '.csv';
    if (!name.endsWith('.csv')) name = name + '.csv';
    downloadCsv(f.content, name);
  }

  function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    toast.classList.add('visible');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () {
      toast.classList.remove('visible');
      setTimeout(function () { toast.hidden = true; }, 300);
    }, 4000);
  }

  function exportRequestDetails(requestId) {
    var req = requests.find(function (r) { return r.requestId === requestId; });
    if (!req) return;
    var headers = ['Request ID', 'Country', 'Stage', 'Status', 'Number of records', 'Impacted Records', 'Requested by', 'Created on', 'Service Now Link', 'Failure RITM', 'Error Message'];
    var row = [req.requestId, req.country || '', req.stage, req.status, req.numberRecords, req.impactedRecords, req.requestedBy, req.createdOn, req.serviceNowLink || '', req.failureRitm || '', ''];
    var csv = [headers.join(','), row.map(csvEscape).join(',')].join('\r\n');
    downloadCsv(csv, 'request_' + req.requestId + '_details.csv');
  }

  function csvEscape(val) {
    var s = String(val == null ? '' : val);
    if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function downloadCsv(csvContent, filename) {
    var blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function openFormModal() {
    formModal.hidden = false;
    formModal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeFormModal() {
    formModal.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(function () { formModal.hidden = true; }, 250);
  }

  createRequestBtn.addEventListener('click', function () {
    editingRequestId = null;
    country.value = '';
    documentName.value = '';
    approvalEmail.value = '';
    csvFileInput.value = '';
    csvFileName.textContent = '';
    clearValidationMessage(csvDropZone.parentElement);
    updateBrowseCsvState();
    updateSubmitState();
    openFormModal();
  });
  modalOverlay.addEventListener('click', function () {
    editingRequestId = null;
    closeFormModal();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && formModal.classList.contains('is-open')) closeFormModal();
  });

  exportBtn.addEventListener('click', function () {
    if (requests.length === 0) {
      showToast('No requests to export.');
      return;
    }
    var headers = ['Request ID', 'Country', 'Stage', 'Status', 'Number of records', 'Impacted Records', 'Requested by', 'Created on', 'Service Now Link', 'Failure RITM', 'Details', 'Error Message'];
    var rows = requests.map(function (r) {
      return [
        r.requestId,
        r.country || '',
        r.stage,
        r.status,
        r.numberRecords,
        r.impactedRecords,
        r.requestedBy,
        r.createdOn,
        r.serviceNowLink || '',
        r.failureRitm || '',
        r.detailsText || '',
        (r.errorMessageColumn && r.errorMessageColumn.length) ? r.errorMessageColumn.join('; ') : ''
      ].map(csvEscape).join(',');
    });
    var csv = [headers.join(','), rows.join('\r\n')].join('\r\n');
    downloadCsv(csv, 'time_entry_dashboard_export.csv');
    showToast('Export downloaded.');
  });

  country.addEventListener('change', updateBrowseCsvState);
  requestType.addEventListener('change', updateBrowseCsvState);

  browseCsvBtn.addEventListener('click', function () {
    if (!browseCsvBtn.disabled) csvFileInput.click();
  });

  csvFileInput.addEventListener('change', function () {
    var file = csvFileInput.files && csvFileInput.files[0];
    csvFileName.textContent = file ? 'Selected: ' + file.name : '';
    updateSubmitState();
  });

  function setupDropZone(zone, input, fileNameEl) {
    function preventDefault(e) { e.preventDefault(); e.stopPropagation(); }
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (eventName) {
      zone.addEventListener(eventName, preventDefault, false);
    });
    ['dragenter', 'dragover'].forEach(function (eventName) {
      zone.addEventListener(eventName, function () { zone.classList.add('drag-over'); }, false);
    });
    ['dragleave', 'drop'].forEach(function (eventName) {
      zone.addEventListener(eventName, function () { zone.classList.remove('drag-over'); }, false);
    });
    zone.addEventListener('drop', function (e) {
      var files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length > 0) {
        input.files = files;
        fileNameEl.textContent = 'Selected: ' + files[0].name;
        if (input === csvFileInput) updateSubmitState();
      }
    }, false);
  }

  setupDropZone(csvDropZone, csvFileInput, csvFileName);

  function showValidationMessage(element, message, isSuccess) {
    var parent = element.parentNode;
    var existing = parent.querySelector('.validation-message');
    if (existing) existing.remove();
    var msgEl = document.createElement('p');
    msgEl.className = 'validation-message' + (isSuccess ? ' success' : '');
    msgEl.setAttribute('role', 'alert');
    msgEl.textContent = message;
    parent.insertBefore(msgEl, element.nextSibling);
  }

  function clearValidationMessage(container) {
    var msg = container && container.querySelector('.validation-message');
    if (msg) msg.remove();
  }

  function validateCsvFile(file) {
    if (!file) return { valid: false, message: 'Please select a CSV file.' };
    var name = file.name.toLowerCase();
    if (!name.endsWith('.csv')) return { valid: false, message: 'Only CSV format is supported.' };
    if (file.size > MAX_CSV_BYTES) return { valid: false, message: 'File size must not exceed ' + MAX_CSV_SIZE_MB + 'MB.' };
    return { valid: true };
  }

  function checkCsvNotEmpty(file, callback) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var text = (e.target.result || '').trim();
      var lines = text.split(/\r?\n/).filter(function (line) { return line.replace(/,/g, '').trim().length > 0; });
      callback(lines.length === 0 ? { valid: false, message: 'File is completely blank or has no data.' } : { valid: true });
    };
    reader.onerror = function () { callback({ valid: false, message: 'Unable to read file.' }); };
    reader.readAsText(file, 'UTF-8');
  }

  submitValidationBtn.addEventListener('click', function () {
    if (submitValidationBtn.disabled) return;

    var file = csvFileInput.files && csvFileInput.files[0];
    clearValidationMessage(csvDropZone.parentElement);

    var staticCheck = validateCsvFile(file);
    if (!staticCheck.valid) {
      showValidationMessage(csvDropZone, staticCheck.message, false);
      return;
    }

    checkCsvNotEmpty(file, function (blankCheck) {
      if (!blankCheck.valid) {
        showValidationMessage(csvDropZone, blankCheck.message, false);
        return;
      }
      showValidationMessage(csvDropZone, editingRequestId ? 'Validation passed. Edited file saved.' : 'Validation passed. Request submitted.', true);

      var reader = new FileReader();
      reader.onload = function (e) {
        var fullText = e.target.result || '';
        var lines = fullText.split(/\r?\n/).filter(function (l) { return l.trim().length > 0; });
        var numRec = lines.length > 1 ? lines.length - 1 : (lines.length === 1 ? 1 : 1000);

        if (editingRequestId) {
          var req = requests.find(function (r) { return r.requestId === editingRequestId; });
          if (req) {
            if (!req.uploadedFiles) req.uploadedFiles = [];
            if (req.uploadedFiles.length >= 2) {
              showToast('Your edits have expired or are limited. We will close this request. Please create a new request.');
              closeFormModal();
              editingRequestId = null;
              return;
            }
            var editNum = req.uploadedFiles.length;
            var label = editNum === 0 ? 'Original' : 'Edited';
            req.uploadedFiles.push({ name: file.name, content: fullText, uploadedAt: Date.now(), label: label });
            renderDashboard();
          }
          editingRequestId = null;
        } else {
          addRequest('File Validation in progress', '', numRec, numRec, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, country.value || '');
          var newReq = requests[requests.length - 1];
          newReq.uploadedFiles.push({ name: file.name, content: fullText, uploadedAt: Date.now(), label: 'Original' });
          renderDashboard();
        }

        country.value = '';
        documentName.value = '';
        approvalEmail.value = '';
        csvFileInput.value = '';
        csvFileName.textContent = '';
        clearValidationMessage(csvDropZone.parentElement);
        updateBrowseCsvState();
        updateSubmitState();
        closeFormModal();
      };
      reader.readAsText(file, 'UTF-8');
    });
  });

  cancelBtn.addEventListener('click', function () {
    editingRequestId = null;
    country.value = '';
    documentName.value = '';
    approvalEmail.value = '';
    csvFileInput.value = '';
    csvFileName.textContent = '';
    clearValidationMessage(csvDropZone.parentElement);
    updateBrowseCsvState();
    updateSubmitState();
    closeFormModal();
  });

  updateBrowseCsvState();
  updateSubmitState();
  seedTestData();
})();
