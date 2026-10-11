var STORAGE_KEY = 'packing-lists-v1';
var LEGACY_STORAGE_KEY = 'packing-list-items-v1';
var DEFAULT_CATEGORIES = [
  'Clothes',
  'Documents',
  'Electronics',
  'Sports Equipment'
];
var TRIP_TYPES = ['Business', 'Holiday', 'Marathon', 'Other'];
var BUILT_IN_TEMPLATES = [
  {
    id: 'builtin-marathon-running',
    name: 'Marathon / Running Trip',
    tripDetails: { destination: '', departureDate: '', returnDate: '', tripType: 'Marathon', notes: '' },
    items: [
      { text: 'Running shoes', category: 'Sports Equipment' },
      { text: 'Running clothes', category: 'Clothes' },
      { text: 'Race bib', category: 'Documents' },
      { text: 'GPS watch', category: 'Electronics' },
      { text: 'Water bottle', category: 'Sports Equipment' }
    ]
  },
  {
    id: 'builtin-summer-holidays',
    name: 'Summer Holidays',
    tripDetails: { destination: '', departureDate: '', returnDate: '', tripType: 'Holiday', notes: '' },
    items: [
      { text: 'T-shirts', category: 'Clothes' },
      { text: 'Swimwear', category: 'Clothes' },
      { text: 'Passport', category: 'Documents' },
      { text: 'Phone charger', category: 'Electronics' }
    ]
  },
  {
    id: 'builtin-business-trip',
    name: 'Business Trip',
    tripDetails: { destination: '', departureDate: '', returnDate: '', tripType: 'Business', notes: '' },
    items: [
      { text: 'Business clothes', category: 'Clothes' },
      { text: 'Laptop', category: 'Electronics' },
      { text: 'Travel documents', category: 'Documents' },
      { text: 'Phone charger', category: 'Electronics' }
    ]
  },
  {
    id: 'builtin-weekend-trip',
    name: 'Weekend Trip',
    tripDetails: { destination: '', departureDate: '', returnDate: '', tripType: 'Holiday', notes: '' },
    items: [
      { text: 'Change of clothes', category: 'Clothes' },
      { text: 'Wallet and ID', category: 'Documents' },
      { text: 'Phone charger', category: 'Electronics' }
    ]
  }
];

var form = document.getElementById('packing-form');
var input = document.getElementById('item-input');
var categorySelect = document.getElementById('category-select');
var list = document.getElementById('packing-list');
var countBadge = document.getElementById('item-count');
var listSelect = document.getElementById('list-select');
var currentListName = document.getElementById('current-list-name');
var newListBtn = document.getElementById('new-list-btn');
var duplicateListBtn = document.getElementById('duplicate-list-btn');
var templatesBtn = document.getElementById('templates-btn');
var templatesModal = document.getElementById('templates-modal');
var templatesList = document.getElementById('templates-list');
var templatesModalCloseBtn = document.getElementById('templates-modal-close');
var templatesCloseBtn = document.getElementById('templates-close-btn');
var saveTemplateBtn = document.getElementById('save-template-btn');
var renameListBtn = document.getElementById('rename-list-btn');
var deleteListBtn = document.getElementById('delete-list-btn');
var manageCategoriesBtn = document.getElementById('manage-categories-btn');
var exportDataBtn = document.getElementById('export-data-btn');
var importDataBtn = document.getElementById('import-data-btn');
var importDataInput = document.getElementById('import-data-input');
var packingProgress = document.getElementById('packing-progress');
var progressDetails = document.getElementById('progress-details');
var tripDetailsDisplay = document.getElementById('trip-details-display');
var editTripDetailsBtn = document.getElementById('edit-trip-details-btn');
var tripDetailsModal = document.getElementById('trip-details-modal');
var tripDetailsForm = document.getElementById('trip-details-form');
var tripDestinationInput = document.getElementById('trip-destination');
var tripDepartureDateInput = document.getElementById('trip-departure-date');
var tripReturnDateInput = document.getElementById('trip-return-date');
var tripTypeSelect = document.getElementById('trip-type');
var tripNotesInput = document.getElementById('trip-notes');
var tripDetailsCloseBtn = document.getElementById('trip-details-close');
var tripDetailsCancelBtn = document.getElementById('trip-details-cancel');
var categoryModal = document.getElementById('category-modal');
var categoryList = document.getElementById('category-list');
var closeCategoryModalBtn = document.getElementById('close-category-modal');
var categoryModalCloseBtn = document.getElementById('category-modal-close');
var addCategoryBtn = document.getElementById('add-category-btn');
var moveCategoryModal = document.getElementById('move-category-modal');
var moveCategorySelect = document.getElementById('move-category-select');
var moveCategoryMessage = document.getElementById('move-category-message');
var moveCategoryConfirmBtn = document.getElementById('move-category-confirm');
var moveCategoryCancelBtn = document.getElementById('move-category-cancel');

var appState = loadState();
var editingItemId = null;
var pendingCategoryToDelete = null;
var modalScrollPosition = 0;

function updateModalScrollLock() {
  var hasOpenModal = document.querySelector('.modal:not(.hidden)') !== null;

  if (hasOpenModal && !document.body.classList.contains('modal-open')) {
    modalScrollPosition = window.pageYOffset || document.documentElement.scrollTop || 0;
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
    document.body.style.top = '-' + modalScrollPosition + 'px';
    return;
  }

  if (!hasOpenModal && document.body.classList.contains('modal-open')) {
    document.documentElement.classList.remove('modal-open');
    document.body.classList.remove('modal-open');
    document.body.style.top = '';
    window.scrollTo(0, modalScrollPosition);
  }
}

function setModalVisibility(modal, isVisible) {
  modal.classList.toggle('hidden', !isVisible);
  updateModalScrollLock();
}

function closeTopmostModal() {
  var openModals = document.querySelectorAll('.modal:not(.hidden)');
  var topModal = openModals[openModals.length - 1];
  if (!topModal) {
    return;
  }

  if (topModal === categoryModal) {
    closeCategoryModal();
  } else if (topModal === moveCategoryModal) {
    closeMoveCategoryModal();
  } else if (topModal === templatesModal) {
    closeTemplatesModal();
  } else if (topModal === tripDetailsModal) {
    closeTripDetailsModal();
  }
}

function createId(prefix) {
  return prefix + '-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

function normalizeCategoryName(category) {
  var name = typeof category === 'string' ? category.trim() : '';
  return name || 'Clothes';
}

function emptyTripDetails() {
  return {
    destination: '',
    departureDate: '',
    returnDate: '',
    tripType: '',
    notes: ''
  };
}

function normalizeTripDetails(details) {
  details = details && typeof details === 'object' && !Array.isArray(details) ? details : {};
  return {
    destination: typeof details.destination === 'string' ? details.destination : '',
    departureDate: typeof details.departureDate === 'string' ? details.departureDate : '',
    returnDate: typeof details.returnDate === 'string' ? details.returnDate : '',
    tripType: TRIP_TYPES.indexOf(details.tripType) >= 0 ? details.tripType : '',
    notes: typeof details.notes === 'string' ? details.notes : ''
  };
}

function isValidTripDate(value) {
  if (!value) {
    return true;
  }

  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  var parsedDate = new Date(value + 'T00:00:00Z');
  return !isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === value;
}

function isValidTripDetails(details) {
  if (details === undefined) {
    return true;
  }
  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    return false;
  }

  var fields = ['destination', 'departureDate', 'returnDate', 'tripType', 'notes'];
  if (!fields.every(function(field) {
    return details[field] === undefined || typeof details[field] === 'string';
  })) {
    return false;
  }

  var departureDate = details.departureDate || '';
  var returnDate = details.returnDate || '';
  return isValidTripDate(departureDate) && isValidTripDate(returnDate) &&
    (!departureDate || !returnDate || returnDate >= departureDate) &&
    (!details.tripType || TRIP_TYPES.indexOf(details.tripType) >= 0);
}

function normalizeTemplate(template) {
  if (!template || typeof template !== 'object' || Array.isArray(template) ||
      typeof template.name !== 'string' || !template.name.trim() || !Array.isArray(template.items)) {
    return null;
  }

  return {
    id: typeof template.id === 'string' && template.id ? template.id : createId('template'),
    name: template.name.trim(),
    items: template.items.filter(function(item) {
      return item && typeof item.text === 'string' && item.text.trim() &&
        typeof item.category === 'string' && item.category.trim();
    }).map(function(item) {
      return { text: item.text, category: item.category };
    }),
    tripDetails: normalizeTripDetails(template.tripDetails)
  };
}

function normalizeTemplates(templates) {
  if (!Array.isArray(templates)) {
    return [];
  }

  return templates.map(normalizeTemplate).filter(function(template) {
    return template !== null;
  });
}

function getAllTemplates() {
  return BUILT_IN_TEMPLATES.concat(normalizeTemplates(appState.templates));
}

function ensureCategories(categoryList) {
  var unique = [];
  var list = Array.isArray(categoryList) ? categoryList : [];

  list.forEach(function(category) {
    var trimmed = normalizeCategoryName(category);
    if (unique.indexOf(trimmed) === -1) {
      unique.push(trimmed);
    }
  });

  DEFAULT_CATEGORIES.forEach(function(category) {
    if (unique.indexOf(category) === -1) {
      unique.unshift(category);
    }
  });

  return unique;
}

function getCategories() {
  if (appState && Array.isArray(appState.categories) && appState.categories.length) {
    return appState.categories;
  }
  return DEFAULT_CATEGORIES.slice(0);
}

function normalizeCategory(category) {
  var normalized = normalizeCategoryName(category);
  return getCategories().indexOf(normalized) >= 0 ? normalized : 'Clothes';
}

function normalizeItem(item, categoriesList) {
  categoriesList = categoriesList || DEFAULT_CATEGORIES.slice(0);
  var normalizedCategory = normalizeCategoryName(item && item.category);
  var categorySet = ensureCategories(categoriesList);

  if (categorySet.indexOf(normalizedCategory) === -1) {
    categorySet.push(normalizedCategory);
  }

  return {
    id: item && item.id ? item.id : createId('item'),
    text: typeof item.text === 'string' ? item.text.trim() : '',
    packed: !!(item && item.packed),
    category: normalizedCategory
  };
}

function createList(name) {
  return {
    id: createId('list'),
    name: (name || '').trim() || 'My Packing List',
    tripDetails: emptyTripDetails(),
    items: []
  };
}

function getActiveList() {
  if (!appState || !Array.isArray(appState.lists) || !appState.lists.length) {
    return null;
  }

  return appState.lists.filter(function(listItem) {
    return listItem.id === appState.activeListId;
  })[0] || appState.lists[0];
}

function loadState() {
  try {
    var savedLists = localStorage.getItem(STORAGE_KEY);

    if (savedLists) {
      var parsed = JSON.parse(savedLists);

      if (parsed && Array.isArray(parsed.lists) && parsed.lists.length > 0) {
        var categories = ensureCategories(parsed.categories || DEFAULT_CATEGORIES.slice(0));
        var normalizedLists = parsed.lists.map(function(list) {
          return {
            id: list.id || createId('list'),
            name: (list.name || '').trim() || 'My Packing List',
            tripDetails: normalizeTripDetails(list.tripDetails),
            items: Array.isArray(list.items)
              ? list.items.map(function(item) {
                  return normalizeItem(item, categories);
                }).filter(function(item) {
                  return item.text;
                })
              : []
          };
        });

        var activeListId = normalizedLists.some(function(list) {
          return list.id === parsed.activeListId;
        }) ? parsed.activeListId : normalizedLists[0].id;

        return {
          lists: normalizedLists,
          categories: categories,
          activeListId: activeListId,
          templates: normalizeTemplates(parsed.templates)
        };
      }
    }
  } catch (error) {
    console.warn('Could not read saved packing lists:', error);
  }

  var legacyItems = localStorage.getItem(LEGACY_STORAGE_KEY);

  if (legacyItems) {
    try {
      var parsedLegacy = JSON.parse(legacyItems);

      if (Array.isArray(parsedLegacy)) {
        var migratedList = createList('My Packing List');
        migratedList.items = parsedLegacy.map(function(item) {
          return normalizeItem(item, DEFAULT_CATEGORIES.slice(0));
        }).filter(function(item) {
          return item.text;
        });

        var migratedState = {
          lists: [migratedList],
          categories: DEFAULT_CATEGORIES.slice(0),
          activeListId: migratedList.id,
          templates: []
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedState));
        return migratedState;
      }
    } catch (error) {
      console.warn('Could not read legacy packing list:', error);
    }
  }

  var defaultList = createList('My Packing List');
  var initialState = {
    lists: [defaultList],
    categories: DEFAULT_CATEGORIES.slice(0),
    activeListId: defaultList.id,
    templates: []
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));
  return initialState;
}

function saveState() {
  appState.categories = ensureCategories(appState.categories || DEFAULT_CATEGORIES.slice(0));
  appState.templates = normalizeTemplates(appState.templates);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function exportData() {
  var stateToExport = appState;

  try {
    var savedState = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (savedState && Array.isArray(savedState.lists) && savedState.lists.length > 0) {
      stateToExport = savedState;
    }
  } catch (error) {
    console.warn('Could not read saved packing lists for export:', error);
  }

  var exportFile = {
    application: 'Packing List',
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    data: exportStateWithTemplates(stateToExport)
  };
  var blob = new Blob([JSON.stringify(exportFile, null, 2)], { type: 'application/json' });
  var downloadUrl = URL.createObjectURL(blob);
  var downloadLink = document.createElement('a');
  downloadLink.href = downloadUrl;
  downloadLink.download = 'packing-list-data.json';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  window.setTimeout(function() {
    URL.revokeObjectURL(downloadUrl);
  }, 1000);
}

function exportStateWithTemplates(state) {
  var exportState = {};
  Object.keys(state).forEach(function(key) {
    exportState[key] = state[key];
  });
  exportState.templates = normalizeTemplates(state.templates);
  return exportState;
}

function validateImportData(importFile) {
  if (!importFile || importFile.application !== 'Packing List' || importFile.formatVersion !== 1) {
    return null;
  }

  var importedState = importFile.data;
  if (!importedState || typeof importedState !== 'object' || Array.isArray(importedState) ||
      !Array.isArray(importedState.lists) || importedState.lists.length === 0 ||
      !Array.isArray(importedState.categories) || importedState.categories.length === 0 ||
      typeof importedState.activeListId !== 'string') {
    return null;
  }

  var listIds = {};
  var validLists = importedState.lists.every(function(listItem) {
    if (!listItem || typeof listItem !== 'object' || Array.isArray(listItem) ||
        typeof listItem.id !== 'string' || !listItem.id || listIds[listItem.id] ||
        typeof listItem.name !== 'string' || !listItem.name.trim() || !Array.isArray(listItem.items)) {
      return false;
    }

    if (!isValidTripDetails(listItem.tripDetails)) {
      return false;
    }

    listIds[listItem.id] = true;
    var itemIds = {};
    return listItem.items.every(function(item) {
      if (!item || typeof item !== 'object' || Array.isArray(item) ||
          typeof item.id !== 'string' || !item.id || itemIds[item.id] ||
          typeof item.text !== 'string' || !item.text.trim() || typeof item.packed !== 'boolean' ||
          typeof item.category !== 'string' || !item.category.trim()) {
        return false;
      }

      itemIds[item.id] = true;
      return true;
    });
  });

  if (!validLists || !importedState.categories.every(function(category) {
    return typeof category === 'string' && !!category.trim();
  }) || !listIds[importedState.activeListId]) {
    return null;
  }

  if (importedState.templates !== undefined) {
    if (!Array.isArray(importedState.templates)) {
      return null;
    }

    var templateIds = {};
    var validTemplates = importedState.templates.every(function(template) {
      if (!template || typeof template !== 'object' || Array.isArray(template) ||
          typeof template.id !== 'string' || !template.id || templateIds[template.id] ||
          typeof template.name !== 'string' || !template.name.trim() || !Array.isArray(template.items) ||
          !isValidTripDetails(template.tripDetails)) {
        return false;
      }

      templateIds[template.id] = true;
      return template.items.every(function(item) {
        return item && typeof item === 'object' && !Array.isArray(item) &&
          typeof item.text === 'string' && !!item.text.trim() &&
          typeof item.category === 'string' && !!item.category.trim();
      });
    });

    if (!validTemplates) {
      return null;
    }
  }

  if (Object.prototype.hasOwnProperty.call(importedState, 'settings') &&
      (!importedState.settings || typeof importedState.settings !== 'object' || Array.isArray(importedState.settings))) {
    return null;
  }

  return importedState;
}

function importDataFile(file) {
  if (!file) {
    return;
  }

  var reader = new FileReader();
  reader.onload = function() {
    var importedState;

    try {
      importedState = validateImportData(JSON.parse(reader.result));
    } catch (error) {
      alert('The selected file is not valid Packing List JSON.');
      importDataInput.value = '';
      return;
    }

    if (!importedState) {
      alert('The selected file does not contain a valid Packing List backup.');
      importDataInput.value = '';
      return;
    }

    if (!window.confirm('Import this backup and replace all packing lists and categories currently saved in this browser?')) {
      importDataInput.value = '';
      return;
    }

    appState = importedState;
    appState.templates = normalizeTemplates(importedState.templates);
    appState.lists.forEach(function(listItem) {
      listItem.tripDetails = normalizeTripDetails(listItem.tripDetails);
    });
    editingItemId = null;
    saveState();
    renderApp();
    importDataInput.value = '';
  };
  reader.onerror = function() {
    alert('The selected file could not be read.');
    importDataInput.value = '';
  };
  reader.readAsText(file);
}

function renderCategoryOptions() {
  var categories = getCategories();
  var selectedValue = categorySelect.value && categories.indexOf(categorySelect.value) >= 0 ? categorySelect.value : categories[0];

  categorySelect.innerHTML = '';
  categories.forEach(function(category) {
    var option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
  categorySelect.value = selectedValue;
}

function updateCount() {
  var activeList = getActiveList();
  var packedCount = activeList.items.filter(function(item) {
    return item.packed;
  }).length;
  var total = activeList.items.length;
  var percentage = total === 0 ? 0 : Math.round((packedCount / total) * 100);
  countBadge.textContent = total + ' item' + (total === 1 ? '' : 's') + ' • ' + packedCount + ' packed';
  packingProgress.value = percentage;
  progressDetails.textContent = packedCount + ' of ' + total + ' packed · ' + percentage + '%';
}

function renderListSelector() {
  var activeList = getActiveList();
  listSelect.innerHTML = '';

  appState.lists.forEach(function(listItem) {
    var option = document.createElement('option');
    option.value = listItem.id;
    option.textContent = listItem.name;
    listSelect.appendChild(option);
  });

  listSelect.value = activeList.id;
  currentListName.textContent = activeList.name;
}

function renderTripDetails() {
  var details = normalizeTripDetails(getActiveList().tripDetails);
  var fields = [
    ['Destination', details.destination],
    ['Departure Date', details.departureDate],
    ['Return Date', details.returnDate],
    ['Trip Type', details.tripType],
    ['Notes', details.notes]
  ];

  tripDetailsDisplay.innerHTML = '';
  fields.forEach(function(field) {
    var term = document.createElement('dt');
    term.textContent = field[0];
    var description = document.createElement('dd');
    description.textContent = field[1] || 'Not set';
    tripDetailsDisplay.appendChild(term);
    tripDetailsDisplay.appendChild(description);
  });
}

function updateTripDateValidation() {
  var departureDate = tripDepartureDateInput.value;
  var returnDate = tripReturnDateInput.value;
  tripReturnDateInput.min = departureDate;
  tripReturnDateInput.setCustomValidity(
    departureDate && returnDate && returnDate < departureDate
      ? 'Return date cannot be earlier than departure date.'
      : ''
  );
}

function openTripDetailsModal() {
  var details = normalizeTripDetails(getActiveList().tripDetails);
  tripDestinationInput.value = details.destination;
  tripDepartureDateInput.value = details.departureDate;
  tripReturnDateInput.value = details.returnDate;
  tripTypeSelect.value = details.tripType;
  tripNotesInput.value = details.notes;
  updateTripDateValidation();
  setModalVisibility(tripDetailsModal, true);
}

function closeTripDetailsModal() {
  setModalVisibility(tripDetailsModal, false);
  tripReturnDateInput.setCustomValidity('');
}

function renderCategoryManager() {
  categoryList.innerHTML = '';

  getCategories().forEach(function(category) {
    var row = document.createElement('div');
    row.className = 'category-row';

    var label = document.createElement('span');
    label.textContent = category;

    var actions = document.createElement('div');
    actions.className = 'category-row-actions';

    var renameButton = document.createElement('button');
    renameButton.type = 'button';
    renameButton.className = 'secondary-btn thin-btn';
    renameButton.textContent = 'Rename';
    renameButton.addEventListener('click', function() {
      renameCategory(category);
    });

    var deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'danger-btn thin-btn';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', function() {
      deleteCategory(category);
    });

    actions.appendChild(renameButton);
    actions.appendChild(deleteButton);
    row.appendChild(label);
    row.appendChild(actions);
    categoryList.appendChild(row);
  });
}

function renderTemplatesManager() {
  templatesList.innerHTML = '';

  getAllTemplates().forEach(function(template, index) {
    var isCustom = index >= BUILT_IN_TEMPLATES.length;
    var row = document.createElement('div');
    row.className = 'category-row template-row';

    var information = document.createElement('div');
    information.className = 'template-row-info';
    var name = document.createElement('strong');
    name.className = 'template-name';
    name.textContent = template.name;
    var count = document.createElement('span');
    count.className = 'template-count';
    count.textContent = template.items.length + ' item' + (template.items.length === 1 ? '' : 's') + (isCustom ? ' · Custom' : ' · Built-in');
    information.appendChild(name);
    information.appendChild(count);

    var actions = document.createElement('div');
    actions.className = 'category-row-actions';
    var useButton = document.createElement('button');
    useButton.type = 'button';
    useButton.className = 'primary-btn thin-btn';
    useButton.textContent = 'Use';
    useButton.addEventListener('click', function() {
      createListFromTemplate(template);
    });
    actions.appendChild(useButton);

    if (isCustom) {
      var renameButton = document.createElement('button');
      renameButton.type = 'button';
      renameButton.className = 'secondary-btn thin-btn';
      renameButton.textContent = 'Rename';
      renameButton.addEventListener('click', function() {
        renameCustomTemplate(template.id);
      });

      var deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'danger-btn thin-btn';
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', function() {
        deleteCustomTemplate(template.id);
      });
      actions.appendChild(renameButton);
      actions.appendChild(deleteButton);
    }

    row.appendChild(information);
    row.appendChild(actions);
    templatesList.appendChild(row);
  });
}

function openTemplatesModal() {
  renderTemplatesManager();
  setModalVisibility(templatesModal, true);
}

function closeTemplatesModal() {
  setModalVisibility(templatesModal, false);
}

function saveCurrentListAsTemplate() {
  var activeList = getActiveList();
  var templateName = prompt('Name this custom template:', activeList.name + ' Template');

  if (templateName === null) {
    return;
  }

  templateName = templateName.trim();
  if (!templateName) {
    alert('Please enter a template name.');
    return;
  }

  if (getAllTemplates().some(function(template) {
    return template.name.toLowerCase() === templateName.toLowerCase();
  })) {
    alert('A template with that name already exists.');
    return;
  }

  appState.templates = normalizeTemplates(appState.templates).concat({
    id: createId('template'),
    name: templateName,
    items: activeList.items.map(function(item) {
      return { text: item.text, category: item.category };
    }),
    tripDetails: normalizeTripDetails(activeList.tripDetails)
  });
  saveState();
  renderTemplatesManager();
}

function renameCustomTemplate(templateId) {
  var template = appState.templates.filter(function(item) {
    return item.id === templateId;
  })[0];
  if (!template) {
    return;
  }

  var newName = prompt('Rename template:', template.name);
  if (newName === null) {
    return;
  }

  newName = newName.trim();
  if (!newName) {
    alert('Please enter a template name.');
    return;
  }

  if (getAllTemplates().some(function(item) {
    return item.id !== templateId && item.name.toLowerCase() === newName.toLowerCase();
  })) {
    alert('A template with that name already exists.');
    return;
  }

  template.name = newName;
  saveState();
  renderTemplatesManager();
}

function deleteCustomTemplate(templateId) {
  if (!window.confirm('Delete this custom template? Existing packing lists will not be changed.')) {
    return;
  }

  appState.templates = appState.templates.filter(function(template) {
    return template.id !== templateId;
  });
  saveState();
  renderTemplatesManager();
}

function createListFromTemplate(template) {
  var listName = prompt('Name your new packing list:', template.name);
  if (listName === null) {
    return;
  }

  listName = listName.trim();
  if (!listName) {
    alert('Please enter a name for the packing list.');
    return;
  }

  var categories = getCategories().slice(0);
  var newList = {
    id: createId('list'),
    name: listName,
    tripDetails: normalizeTripDetails(template.tripDetails),
    items: template.items.map(function(item) {
      if (categories.indexOf(item.category) === -1) {
        categories.push(item.category);
      }
      return {
        id: createId('item'),
        text: item.text,
        packed: false,
        category: item.category
      };
    })
  };

  appState.categories = ensureCategories(categories);
  appState.lists.push(newList);
  appState.activeListId = newList.id;
  saveState();
  renderApp();
  closeTemplatesModal();
}

function closeCategoryModal() {
  setModalVisibility(categoryModal, false);
}

function openCategoryModal() {
  renderCategoryManager();
  setModalVisibility(categoryModal, true);
}

function closeMoveCategoryModal() {
  setModalVisibility(moveCategoryModal, false);
  pendingCategoryToDelete = null;
}

function openMoveCategoryModal(category) {
  var otherCategories = getCategories().filter(function(item) {
    return item !== category;
  });
  moveCategorySelect.innerHTML = '';

  if (otherCategories.length === 0) {
    alert('You need at least one different category available before deleting this one.');
    return;
  }

  otherCategories.forEach(function(item) {
    var option = document.createElement('option');
    option.value = item;
    option.textContent = item;
    moveCategorySelect.appendChild(option);
  });

  moveCategoryMessage.textContent = '"' + category + '" contains items. Choose a category to move them into before deleting it.';
  pendingCategoryToDelete = category;
  setModalVisibility(moveCategoryModal, true);
}

function renameCategory(currentCategory) {
  var newName = prompt('Rename category:', currentCategory);

  if (newName === null) {
    return;
  }

  var trimmedName = newName.trim();
  if (!trimmedName) {
    alert('Please enter a category name.');
    return;
  }

  var existingCategory = getCategories().find(function(category) {
    return category.toLowerCase() === trimmedName.toLowerCase();
  });

  if (existingCategory && existingCategory !== currentCategory) {
    alert('A category with that name already exists.');
    return;
  }

  appState.categories = getCategories().map(function(category) {
    return category === currentCategory ? trimmedName : category;
  });

  appState.lists.forEach(function(listItem) {
    listItem.items.forEach(function(item) {
      if (item.category === currentCategory) {
        item.category = trimmedName;
      }
    });
  });

  appState.templates.forEach(function(template) {
    template.items.forEach(function(item) {
      if (item.category === currentCategory) {
        item.category = trimmedName;
      }
    });
  });

  saveState();
  renderApp();
  closeCategoryModal();
}

function addCategory() {
  var newName = prompt('New category name:');

  if (newName === null) {
    return;
  }

  var trimmedName = newName.trim();
  if (!trimmedName) {
    alert('Please enter a category name.');
    return;
  }

  if (getCategories().some(function(category) {
    return category.toLowerCase() === trimmedName.toLowerCase();
  })) {
    alert('A category with that name already exists.');
    return;
  }

  appState.categories = getCategories().concat(trimmedName);
  saveState();
  renderApp();
  renderCategoryManager();
}

function deleteCategory(category) {
  if (getCategories().length <= 1) {
    alert('At least one category must remain.');
    return;
  }

  var itemCount = 0;
  appState.lists.forEach(function(listItem) {
    itemCount += listItem.items.filter(function(item) {
      return item.category === category;
    }).length;
  });
  appState.templates.forEach(function(template) {
    itemCount += template.items.filter(function(item) {
      return item.category === category;
    }).length;
  });

  if (itemCount > 0) {
    openMoveCategoryModal(category);
    return;
  }

  appState.categories = getCategories().filter(function(item) {
    return item !== category;
  });
  saveState();
  renderApp();
  closeCategoryModal();
}

function moveCategoryItems(oldCategory, newCategory) {
  appState.lists.forEach(function(listItem) {
    listItem.items.forEach(function(item) {
      if (item.category === oldCategory) {
        item.category = newCategory;
      }
    });
  });
  appState.templates.forEach(function(template) {
    template.items.forEach(function(item) {
      if (item.category === oldCategory) {
        item.category = newCategory;
      }
    });
  });
}

function createItemRow(currentList, item) {
  var listItem = document.createElement('li');
  listItem.className = 'item-row ' + (item.packed ? 'packed' : '');

  var itemMain = document.createElement('div');
  itemMain.className = 'item-main';

  var checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = item.packed;
  checkbox.setAttribute('aria-label', 'Mark ' + item.text + ' as packed');
  checkbox.addEventListener('change', function() {
    item.packed = checkbox.checked;
    saveState();
    renderApp();
  });

  if (editingItemId === item.id) {
    var editPanel = document.createElement('div');
    editPanel.className = 'edit-panel';

    var editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.value = item.text;
    editInput.className = 'edit-input';
    editInput.maxLength = 80;

    var editCategory = document.createElement('select');
    editCategory.className = 'edit-select';
    getCategories().forEach(function(category) {
      var option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      editCategory.appendChild(option);
    });
    editCategory.value = item.category;

    var actionGroup = document.createElement('div');
    actionGroup.className = 'item-actions';

    var saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'save-btn';
    saveButton.textContent = 'Save';
    saveButton.addEventListener('click', function() {
      var updatedText = editInput.value.trim();

      if (!updatedText) {
        editInput.focus();
        return;
      }

      item.text = updatedText;
      item.category = normalizeCategory(editCategory.value);
      editingItemId = null;
      saveState();
      renderApp();
    });

    var cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'secondary-btn small-btn';
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', function() {
      editingItemId = null;
      renderApp();
    });

    actionGroup.appendChild(saveButton);
    actionGroup.appendChild(cancelButton);

    editPanel.appendChild(editInput);
    editPanel.appendChild(editCategory);
    itemMain.appendChild(checkbox);
    itemMain.appendChild(editPanel);
    listItem.appendChild(itemMain);
    listItem.appendChild(actionGroup);
    return listItem;
  }

  var text = document.createElement('span');
  text.className = 'item-name';
  text.textContent = item.text;

  var actionGroup = document.createElement('div');
  actionGroup.className = 'item-actions';

  var editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = 'edit-btn';
  editButton.textContent = 'Edit';
  editButton.setAttribute('aria-label', 'Edit ' + item.text);
  editButton.addEventListener('click', function() {
    editingItemId = item.id;
    renderApp();
  });

  var deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'delete-btn';
  deleteButton.textContent = 'Delete';
  deleteButton.setAttribute('aria-label', 'Delete ' + item.text);
  deleteButton.addEventListener('click', function() {
    currentList.items = currentList.items.filter(function(currentItem) {
      return currentItem.id !== item.id;
    });
    saveState();
    renderApp();
  });

  itemMain.appendChild(checkbox);
  itemMain.appendChild(text);
  listItem.appendChild(itemMain);
  actionGroup.appendChild(editButton);
  actionGroup.appendChild(deleteButton);
  listItem.appendChild(actionGroup);

  return listItem;
}

function renderList() {
  var activeList = getActiveList();
  list.innerHTML = '';

  function renderEmptyCategory(category) {
    var emptyGroup = document.createElement('li');
    emptyGroup.className = 'category-group';

    var heading = document.createElement('h2');
    heading.className = 'category-heading';
    heading.textContent = category;

    var emptyItem = document.createElement('div');
    emptyItem.className = 'empty-state';
    emptyItem.textContent = 'No items in this category';

    emptyGroup.appendChild(heading);
    emptyGroup.appendChild(emptyItem);
    list.appendChild(emptyGroup);
  }

  if (activeList.items.length === 0) {
    getCategories().forEach(renderEmptyCategory);
    updateCount();
    return;
  }

  getCategories().forEach(function(category) {
    var categoryItems = activeList.items.filter(function(item) {
      return item.category === category;
    });
    var group = document.createElement('li');
    group.className = 'category-group';

    var heading = document.createElement('h2');
    heading.className = 'category-heading';
    heading.textContent = category;

    var groupedList = document.createElement('ul');
    groupedList.className = 'category-items';

    if (categoryItems.length === 0) {
      var emptyItem = document.createElement('li');
      emptyItem.className = 'empty-state';
      emptyItem.textContent = 'No items in this category';
      groupedList.appendChild(emptyItem);
    } else {
      categoryItems.forEach(function(item) {
        groupedList.appendChild(createItemRow(activeList, item));
      });
    }

    group.appendChild(heading);
    group.appendChild(groupedList);
    list.appendChild(group);
  });

  updateCount();
}

function renderApp() {
  var activeList = getActiveList();
  if (!activeList) {
    return;
  }

  if (editingItemId && !activeList.items.some(function(item) {
    return item.id === editingItemId;
  })) {
    editingItemId = null;
  }

  renderCategoryOptions();
  renderListSelector();
  renderTripDetails();
  renderList();
}

function createNewList() {
  var listName = prompt('Name your new packing list:', 'Trip ' + (appState.lists.length + 1));

  if (listName === null) {
    return;
  }

  var trimmedName = listName.trim();
  var newList = createList(trimmedName || 'Trip ' + (appState.lists.length + 1));
  appState.lists.push(newList);
  appState.activeListId = newList.id;
  saveState();
  renderApp();
}

function duplicateCurrentList() {
  var activeList = getActiveList();
  var listName = prompt('Name your duplicated packing list:', activeList.name + ' Copy');

  if (listName === null) {
    return;
  }

  var trimmedName = listName.trim();
  if (!trimmedName) {
    alert('Please enter a name for the packing list.');
    return;
  }

  var duplicatedList = {
    id: createId('list'),
    name: trimmedName,
    tripDetails: normalizeTripDetails(activeList.tripDetails),
    items: activeList.items.map(function(item) {
      return {
        id: createId('item'),
        text: item.text,
        packed: false,
        category: item.category
      };
    })
  };

  appState.lists.push(duplicatedList);
  appState.activeListId = duplicatedList.id;
  saveState();
  renderApp();
}

function renameCurrentList() {
  var activeList = getActiveList();
  var newName = prompt('Rename this packing list:', activeList.name);

  if (newName === null) {
    return;
  }

  var trimmedName = newName.trim();
  if (!trimmedName) {
    alert('Please enter a name for the packing list.');
    return;
  }

  activeList.name = trimmedName;
  saveState();
  renderApp();
}

function deleteCurrentList() {
  var activeList = getActiveList();
  var deleteMessage = 'Delete \"' + activeList.name + '\" and all of its items? This cannot be undone.';

  if (!window.confirm(deleteMessage)) {
    return;
  }

  if (appState.lists.length === 1) {
    appState.lists = [createList('My Packing List')];
  } else {
    appState.lists = appState.lists.filter(function(listItem) {
      return listItem.id !== activeList.id;
    });
    appState.activeListId = appState.lists[0].id;
  }

  saveState();
  renderApp();
}

form.addEventListener('submit', function(event) {
  event.preventDefault();

  var activeList = getActiveList();
  var text = input.value.trim();
  var selectedCategory = normalizeCategory(categorySelect.value);

  if (!text) {
    input.focus();
    return;
  }

  activeList.items.unshift({
    id: createId('item'),
    text: text,
    packed: false,
    category: selectedCategory
  });

  input.value = '';
  categorySelect.value = getCategories()[0];
  input.focus();
  saveState();
  renderApp();
});

listSelect.addEventListener('change', function(event) {
  appState.activeListId = event.target.value;
  saveState();
  renderApp();
});

tripDepartureDateInput.addEventListener('input', updateTripDateValidation);
tripReturnDateInput.addEventListener('input', updateTripDateValidation);
tripDetailsForm.addEventListener('submit', function(event) {
  event.preventDefault();
  updateTripDateValidation();

  if (!tripDetailsForm.checkValidity()) {
    tripDetailsForm.reportValidity();
    return;
  }

  getActiveList().tripDetails = normalizeTripDetails({
    destination: tripDestinationInput.value.trim(),
    departureDate: tripDepartureDateInput.value,
    returnDate: tripReturnDateInput.value,
    tripType: tripTypeSelect.value,
    notes: tripNotesInput.value.trim()
  });
  saveState();
  renderApp();
  closeTripDetailsModal();
});
editTripDetailsBtn.addEventListener('click', openTripDetailsModal);
tripDetailsCloseBtn.addEventListener('click', closeTripDetailsModal);
tripDetailsCancelBtn.addEventListener('click', closeTripDetailsModal);

newListBtn.addEventListener('click', createNewList);
duplicateListBtn.addEventListener('click', duplicateCurrentList);
templatesBtn.addEventListener('click', openTemplatesModal);
templatesModalCloseBtn.addEventListener('click', closeTemplatesModal);
templatesCloseBtn.addEventListener('click', closeTemplatesModal);
saveTemplateBtn.addEventListener('click', saveCurrentListAsTemplate);
renameListBtn.addEventListener('click', renameCurrentList);
deleteListBtn.addEventListener('click', deleteCurrentList);
manageCategoriesBtn.addEventListener('click', openCategoryModal);
exportDataBtn.addEventListener('click', exportData);
importDataBtn.addEventListener('click', function() {
  importDataInput.click();
});
importDataInput.addEventListener('change', function() {
  importDataFile(importDataInput.files[0]);
});
closeCategoryModalBtn.addEventListener('click', closeCategoryModal);
categoryModalCloseBtn.addEventListener('click', closeCategoryModal);
addCategoryBtn.addEventListener('click', addCategory);
moveCategoryCancelBtn.addEventListener('click', closeMoveCategoryModal);
moveCategoryConfirmBtn.addEventListener('click', function() {
  var targetCategory = moveCategorySelect.value;

  if (!targetCategory || !pendingCategoryToDelete) {
    closeMoveCategoryModal();
    return;
  }

  moveCategoryItems(pendingCategoryToDelete, targetCategory);
  appState.categories = getCategories().filter(function(category) {
    return category !== pendingCategoryToDelete;
  });
  saveState();
  renderApp();
  closeMoveCategoryModal();
  closeCategoryModal();
});

renderApp();

document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeTopmostModal();
  }
});
