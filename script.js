var STORAGE_KEY = 'packing-lists-v1';
var LEGACY_STORAGE_KEY = 'packing-list-items-v1';
var MIGRATION_BACKUP_KEY = 'packing-lists-v1-global-categories-backup';
var SCHEMA_VERSION = 2;
var DEFAULT_CATEGORIES = [
  'Clothes',
  'Documents',
  'Electronics',
  'Sports Equipment',
  'Toiletries'
];
var TRIP_TYPES = ['Business', 'Holiday', 'Marathon', 'Other'];
var BUILT_IN_TEMPLATES = [
  {
    id: 'builtin-marathon-running',
    name: 'Marathon / Running Trip',
    categories: ['Clothes', 'Documents', 'Electronics', 'Sports Equipment'],
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
    categories: ['Clothes', 'Documents', 'Electronics'],
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
    categories: ['Clothes', 'Documents', 'Electronics'],
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
    categories: ['Clothes', 'Documents', 'Electronics'],
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
var selectedCategoryByListId = {};

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

function copyRecord(record) {
  var copy = {};
  if (record && typeof record === 'object' && !Array.isArray(record)) {
    Object.keys(record).forEach(function(key) {
      copy[key] = record[key];
    });
  }
  return copy;
}

function getCategoryName(category) {
  if (typeof category === 'string') {
    return category.trim();
  }
  return category && typeof category.name === 'string' ? category.name.trim() : '';
}

function createCategory(name) {
  return { id: createId('category'), name: name };
}

function normalizeCategoryCollection(categoryRecords, items, fallbackNames, usedIds) {
  var categories = [];
  var categoriesById = {};
  var categoriesBySourceId = {};
  var categoriesByName = {};
  var sourceCategories = Array.isArray(categoryRecords) ? categoryRecords : [];
  var sourceItems = Array.isArray(items) ? items : [];
  usedIds = usedIds || {};

  function addCategory(source, requestedName) {
    var name = getCategoryName(source) || requestedName || DEFAULT_CATEGORIES[0];
    var sourceId = source && typeof source === 'object' && typeof source.id === 'string' ? source.id : '';
    var id = sourceId && !usedIds[sourceId] ? sourceId : createId('category');
    while (usedIds[id]) {
      id = createId('category');
    }
    var category = copyRecord(source);
    category.id = id;
    category.name = name;
    categories.push(category);
    categoriesById[id] = category;
    if (sourceId) {
      categoriesBySourceId[sourceId] = category;
    }
    if (!categoriesByName[name]) {
      categoriesByName[name] = category;
    }
    usedIds[id] = true;
    return category;
  }

  sourceCategories.forEach(function(source) {
    if (source && typeof source === 'object' && typeof source.id === 'string' && categoriesById[source.id]) {
      return;
    }
    addCategory(source);
  });

  (fallbackNames || []).forEach(function(name) {
    if (typeof name === 'string' && name.trim() && !categoriesByName[name.trim()]) {
      addCategory(name.trim());
    }
  });

  var normalizedItems = sourceItems.map(function(sourceItem) {
    var item = copyRecord(sourceItem);
    var category = item.categoryId ? (categoriesBySourceId[item.categoryId] || categoriesById[item.categoryId]) : null;
    if (!category) {
      var legacyName = typeof item.category === 'string' ? item.category.trim() :
        (typeof item.categoryName === 'string' ? item.categoryName.trim() : '');
      category = categoriesByName[legacyName];
      if (!category) {
        category = addCategory(legacyName || DEFAULT_CATEGORIES[0]);
      }
    }

    item.categoryId = category.id;
    delete item.category;
    delete item.categoryName;
    if (typeof item.id !== 'string' || !item.id) {
      item.id = createId('item');
    }
    if (typeof item.text !== 'string') {
      item.text = '';
    }
    if (typeof item.packed !== 'boolean') {
      item.packed = Boolean(item.packed);
    }
    return item;
  });

  if (!categories.length) {
    DEFAULT_CATEGORIES.forEach(function(name) {
      addCategory(name);
    });
  }

  return { categories: categories, items: normalizedItems };
}

function normalizeListRecord(sourceList, fallbackCategories, usedCategoryIds) {
  var list = copyRecord(sourceList);
  var categorySource = Array.isArray(sourceList.categories) ? sourceList.categories : fallbackCategories;
  var normalized = normalizeCategoryCollection(categorySource, sourceList.items, [], usedCategoryIds);
  list.id = typeof sourceList.id === 'string' && sourceList.id ? sourceList.id : createId('list');
  list.name = typeof sourceList.name === 'string' && sourceList.name.trim() ? sourceList.name.trim() : 'My Packing List';
  list.categories = normalized.categories;
  list.items = normalized.items;
  list.tripDetails = normalizeTripDetails(sourceList.tripDetails);
  return list;
}

function normalizeTemplate(template, fallbackCategories, usedCategoryIds) {
  if (!template || typeof template !== 'object' || Array.isArray(template) ||
      typeof template.name !== 'string' || !template.name.trim() || !Array.isArray(template.items)) {
    return null;
  }

  var normalized = normalizeCategoryCollection(template.categories, template.items, fallbackCategories, usedCategoryIds);
  var result = copyRecord(template);
  result.id = typeof template.id === 'string' && template.id ? template.id : createId('template');
  result.name = template.name.trim();
  result.categories = normalized.categories;
  result.items = normalized.items.map(function(item) {
    var templateItem = copyRecord(item);
    delete templateItem.id;
    delete templateItem.packed;
    return templateItem;
  });
  result.tripDetails = normalizeTripDetails(template.tripDetails);
  return result;
}

function normalizeTemplates(templates, fallbackCategories, usedCategoryIds) {
  if (templates === undefined || templates === null) {
    return [];
  }
  if (!Array.isArray(templates)) {
    throw new Error('Saved custom templates have an unsupported structure. Original data was preserved.');
  }

  var normalized = [];
  templates.forEach(function(template) {
    var result = normalizeTemplate(template, fallbackCategories, usedCategoryIds);
    if (!result) {
      throw new Error('A saved custom template has an unsupported structure. Original data was preserved.');
    }
    normalized.push(result);
  });
  return normalized;
}

function getAllTemplates() {
  return BUILT_IN_TEMPLATES.map(function(template) {
    return normalizeTemplate(template, template.categories);
  }).concat(normalizeTemplates(appState.templates));
}

function getCategories(listRecord) {
  var owner = listRecord || getActiveList();
  return owner && Array.isArray(owner.categories) ? owner.categories : [];
}

function getCategoryById(categoryId, categories) {
  return (categories || getCategories()).filter(function(category) {
    return category.id === categoryId;
  })[0] || null;
}

function normalizeCategory(categoryId, categories) {
  var category = getCategoryById(categoryId, categories);
  var categoryList = categories || getCategories();
  return category ? category.id : (categoryList[0] ? categoryList[0].id : '');
}

function normalizeItem(item, categories) {
  var result = copyRecord(item);
  result.id = typeof result.id === 'string' && result.id ? result.id : createId('item');
  result.text = typeof result.text === 'string' ? result.text : '';
  result.packed = typeof result.packed === 'boolean' ? result.packed : Boolean(result.packed);
  result.categoryId = normalizeCategory(result.categoryId || result.category, categories);
  delete result.category;
  return result;
}

function createList(name) {
  var categories = DEFAULT_CATEGORIES.map(function(categoryName) {
    return createCategory(categoryName);
  });
  return {
    id: createId('list'),
    name: (name || '').trim() || 'My Packing List',
    tripDetails: emptyTripDetails(),
    categories: categories,
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

function normalizeAppState(sourceState) {
  var source = copyRecord(sourceState);
  var globalCategories = Array.isArray(source.categories) ? source.categories : [];
  var usedCategoryIds = {};
  var sourceLists = Array.isArray(source.lists) ? source.lists : [];
  var lists = sourceLists.map(function(sourceList) {
    return normalizeListRecord(sourceList, globalCategories, usedCategoryIds);
  });

  if (!lists.length) {
    throw new Error('Saved packing data contains no lists. Original data was preserved.');
  }

  var templates = normalizeTemplates(source.templates, globalCategories, usedCategoryIds);
  var activeListId = lists.some(function(listItem) {
    return listItem.id === source.activeListId;
  }) ? source.activeListId : lists[0].id;

  delete source.categories;
  source.schemaVersion = SCHEMA_VERSION;
  source.lists = lists;
  source.templates = templates;
  source.activeListId = activeListId;
  return source;
}

function backupBeforeMigration(sourceKey, rawValue) {
  var backupRecord = JSON.stringify({
    sourceKey: sourceKey,
    savedAt: new Date().toISOString(),
    rawValue: rawValue
  });
  var existingBackup = localStorage.getItem(MIGRATION_BACKUP_KEY);
  if (existingBackup) {
    try {
      var existingRecord = JSON.parse(existingBackup);
      if (existingRecord.sourceKey === sourceKey && existingRecord.rawValue === rawValue) {
        return;
      }
    } catch (error) {
      // Preserve an unreadable prior backup and write this snapshot separately.
    }
    localStorage.setItem(MIGRATION_BACKUP_KEY + '-' + createId('snapshot'), backupRecord);
    return;
  }

  localStorage.setItem(MIGRATION_BACKUP_KEY, backupRecord);
}

function loadState() {
  var savedState = localStorage.getItem(STORAGE_KEY);
  if (savedState !== null) {
    var parsedState;
    try {
      parsedState = JSON.parse(savedState);
    } catch (error) {
      console.error('Saved packing data is invalid and was left untouched.', error);
      throw new Error('Saved packing data could not be read. It has not been changed.');
    }

    if (!parsedState || typeof parsedState !== 'object' || Array.isArray(parsedState) ||
      !Array.isArray(parsedState.lists) || parsedState.lists.length === 0) {
      throw new Error('Saved packing data has an unsupported structure. It has not been changed.');
    }

    var normalizedState = normalizeAppState(parsedState);
    if (parsedState.schemaVersion !== SCHEMA_VERSION) {
      backupBeforeMigration(STORAGE_KEY, savedState);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedState));
    }
    return normalizedState;
  }

  var legacyItems = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacyItems !== null) {
    var parsedLegacy;
    try {
      parsedLegacy = JSON.parse(legacyItems);
    } catch (error) {
      console.error('Legacy packing data is invalid and was left untouched.', error);
      throw new Error('Legacy packing data could not be read. It has not been changed.');
    }

    if (!Array.isArray(parsedLegacy)) {
      throw new Error('Legacy packing data has an unsupported structure. It has not been changed.');
    }

    var migratedList = createList('My Packing List');
    migratedList.items = parsedLegacy;
    var migratedState = normalizeAppState({
      lists: [migratedList],
      categories: DEFAULT_CATEGORIES,
      activeListId: migratedList.id,
      templates: []
    });
    backupBeforeMigration(LEGACY_STORAGE_KEY, legacyItems);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedState));
    return migratedState;
  }

  var initialState = normalizeAppState({
    lists: [createList('My Packing List')],
    templates: []
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));
  return initialState;
}

function saveState() {
  appState.schemaVersion = SCHEMA_VERSION;
  delete appState.categories;
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
    formatVersion: 2,
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
  if (!importFile || importFile.application !== 'Packing List' ||
      (importFile.formatVersion !== 1 && importFile.formatVersion !== 2)) {
    return null;
  }

  var importedState = importFile.data;
  if (!importedState || typeof importedState !== 'object' || Array.isArray(importedState) ||
      !Array.isArray(importedState.lists) || importedState.lists.length === 0 ||
      typeof importedState.activeListId !== 'string') {
    return null;
  }

  var newSchema = importedState.schemaVersion === SCHEMA_VERSION || importFile.formatVersion >= 2;
  if (newSchema) {
    if (!importedState.lists.every(function(listItem) {
      if (!listItem || !Array.isArray(listItem.categories) || listItem.categories.length === 0 ||
          !Array.isArray(listItem.items)) {
        return false;
      }
      var categoryIds = {};
      if (!listItem.categories.every(function(category) {
        if (!category || typeof category.id !== 'string' || !category.id || categoryIds[category.id] ||
            typeof category.name !== 'string' || !category.name.trim()) {
          return false;
        }
        categoryIds[category.id] = true;
        return true;
      })) {
        return false;
      }
      return listItem.items.every(function(item) {
        return item && typeof item === 'object' && !Array.isArray(item) &&
          typeof item.id === 'string' && !!item.id && typeof item.text === 'string' &&
          typeof item.packed === 'boolean' && typeof item.categoryId === 'string' &&
          !!categoryIds[item.categoryId];
      }) && isValidTripDetails(listItem.tripDetails);
    })) {
      return null;
    }
  } else if (!Array.isArray(importedState.categories) || importedState.categories.length === 0 ||
      !importedState.categories.every(function(category) {
        return typeof category === 'string' && !!category.trim();
      })) {
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
          (newSchema
            ? (typeof item.categoryId !== 'string' || !item.categoryId ||
              !listItem.categories.some(function(category) { return category.id === item.categoryId; }))
            : (typeof item.category !== 'string' || !item.category.trim()))) {
        return false;
      }

      itemIds[item.id] = true;
      return true;
    });
  });

  if (!validLists || !listIds[importedState.activeListId]) {
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
          !isValidTripDetails(template.tripDetails) ||
          (newSchema && (!Array.isArray(template.categories) || template.categories.length === 0))) {
        return false;
      }

      if (newSchema && !template.categories.every(function(category) {
        return category && typeof category.id === 'string' && !!category.id &&
          typeof category.name === 'string' && !!category.name.trim();
      })) {
        return false;
      }

      var templateCategoryIds = {};
      if (newSchema && !template.categories.every(function(category) {
        if (templateCategoryIds[category.id]) {
          return false;
        }
        templateCategoryIds[category.id] = true;
        return true;
      })) {
        return false;
      }

      templateIds[template.id] = true;
      return template.items.every(function(item) {
        if (!item || typeof item !== 'object' || Array.isArray(item) ||
            typeof item.text !== 'string' || !item.text.trim()) {
          return false;
        }
        return newSchema
          ? typeof item.categoryId === 'string' && !!templateCategoryIds[item.categoryId]
          : typeof item.category === 'string' && !!item.category.trim();
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

  try {
    return normalizeAppState(importedState);
  } catch (error) {
    return null;
  }
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
    selectedCategoryByListId = {};
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
  var activeList = getActiveList();
  var currentValue = categorySelect.value;
  if (getCategoryById(currentValue, categories)) {
    selectedCategoryByListId[activeList.id] = currentValue;
  }
  var selectedValue = getCategoryById(selectedCategoryByListId[activeList.id], categories)
    ? selectedCategoryByListId[activeList.id]
    : (categories[0] ? categories[0].id : '');
  selectedCategoryByListId[activeList.id] = selectedValue;

  categorySelect.innerHTML = '';
  categories.forEach(function(category) {
    var option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.name;
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

  getCategories().forEach(function(category, index, categories) {
    var row = document.createElement('div');
    row.className = 'category-row';

    var label = document.createElement('span');
    label.textContent = category.name;

    var actions = document.createElement('div');
    actions.className = 'category-row-actions';

    var moveUpButton = document.createElement('button');
    moveUpButton.type = 'button';
    moveUpButton.className = 'secondary-btn thin-btn';
    moveUpButton.textContent = 'Up';
    moveUpButton.setAttribute('aria-label', 'Move ' + category.name + ' up');
    moveUpButton.disabled = index === 0;
    moveUpButton.addEventListener('click', function() {
      moveCategory(category.id, -1);
    });

    var moveDownButton = document.createElement('button');
    moveDownButton.type = 'button';
    moveDownButton.className = 'secondary-btn thin-btn';
    moveDownButton.textContent = 'Down';
    moveDownButton.setAttribute('aria-label', 'Move ' + category.name + ' down');
    moveDownButton.disabled = index === categories.length - 1;
    moveDownButton.addEventListener('click', function() {
      moveCategory(category.id, 1);
    });

    var renameButton = document.createElement('button');
    renameButton.type = 'button';
    renameButton.className = 'secondary-btn thin-btn';
    renameButton.textContent = 'Rename';
    renameButton.addEventListener('click', function() {
      renameCategory(category.id);
    });

    var deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'danger-btn thin-btn';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', function() {
      deleteCategory(category.id);
    });

    actions.appendChild(moveUpButton);
    actions.appendChild(moveDownButton);
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

  var categoryIds = {};
  var templateCategories = activeList.categories.map(function(category) {
    var templateCategory = copyRecord(category);
    templateCategory.id = createId('category');
    categoryIds[category.id] = templateCategory.id;
    return templateCategory;
  });
  var template = {
    id: createId('template'),
    name: templateName,
    categories: templateCategories,
    items: activeList.items.map(function(item) {
      var templateItem = copyRecord(item);
      delete templateItem.id;
      delete templateItem.packed;
      templateItem.categoryId = categoryIds[item.categoryId];
      return templateItem;
    }),
    tripDetails: normalizeTripDetails(activeList.tripDetails)
  };
  appState.templates = normalizeTemplates(appState.templates).concat(template);
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

  var categoryIds = {};
  var categories = template.categories.map(function(category) {
    var copy = copyRecord(category);
    copy.id = createId('category');
    categoryIds[category.id] = copy.id;
    return copy;
  });
  var newList = {
    id: createId('list'),
    name: listName,
    tripDetails: normalizeTripDetails(template.tripDetails),
    categories: categories,
    items: template.items.map(function(item) {
      var copy = copyRecord(item);
      copy.id = createId('item');
      copy.packed = false;
      copy.categoryId = categoryIds[item.categoryId] || categories[0].id;
      return copy;
    })
  };

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

function openMoveCategoryModal(categoryId) {
  var activeList = getActiveList();
  var category = getCategoryById(categoryId, activeList.categories);
  var otherCategories = getCategories(activeList).filter(function(item) {
    return item.id !== categoryId;
  });
  moveCategorySelect.innerHTML = '';

  if (otherCategories.length === 0) {
    alert('You need at least one different category available before deleting this one.');
    return;
  }

  otherCategories.forEach(function(item) {
    var option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.name;
    moveCategorySelect.appendChild(option);
  });

  var itemCount = getCategoryItemCount(categoryId, activeList);
  moveCategoryMessage.textContent = 'Move ' + itemCount + ' item' + (itemCount === 1 ? '' : 's') + ' from "' + category.name + '" to another category in this packing list, then delete it.';
  pendingCategoryToDelete = categoryId;
  setModalVisibility(moveCategoryModal, true);
}

function renameCategory(categoryId) {
  var activeList = getActiveList();
  var category = getCategoryById(categoryId, activeList.categories);
  if (!category) {
    return;
  }

  var newName = prompt('Rename category:', category.name);

  if (newName === null) {
    return;
  }

  var trimmedName = newName.trim();
  if (!trimmedName) {
    alert('Please enter a category name.');
    return;
  }

  var existingCategory = getCategories(activeList).find(function(item) {
    return item.id !== categoryId && item.name.toLowerCase() === trimmedName.toLowerCase();
  });

  if (existingCategory) {
    alert('A category with that name already exists.');
    return;
  }

  category.name = trimmedName;

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
    return category.name.toLowerCase() === trimmedName.toLowerCase();
  })) {
    alert('A category with that name already exists.');
    return;
  }

  getActiveList().categories.push(createCategory(trimmedName));
  saveState();
  renderApp();
  renderCategoryManager();
}

function getCategoryItemCount(categoryId, listRecord) {
  var owner = listRecord || getActiveList();
  return owner.items.filter(function(item) {
    return item.categoryId === categoryId;
  }).length;
}

function moveCategory(categoryId, offset) {
  var categories = getCategories();
  var index = categories.findIndex(function(category) {
    return category.id === categoryId;
  });
  var destination = index + offset;
  if (index < 0 || destination < 0 || destination >= categories.length) {
    return;
  }

  var category = categories.splice(index, 1)[0];
  categories.splice(destination, 0, category);
  saveState();
  renderApp();
  renderCategoryManager();
}

function deleteCategory(categoryId) {
  var activeList = getActiveList();
  if (activeList.categories.length <= 1) {
    alert('At least one category must remain.');
    return;
  }

  if (getCategoryItemCount(categoryId, activeList) > 0) {
    openMoveCategoryModal(categoryId);
    return;
  }

  if (categorySelect.value === categoryId || selectedCategoryByListId[activeList.id] === categoryId) {
    var fallbackCategory = activeList.categories.filter(function(category) {
      return category.id !== categoryId;
    })[0];
    selectedCategoryByListId[activeList.id] = fallbackCategory ? fallbackCategory.id : '';
  }

  activeList.categories = activeList.categories.filter(function(item) {
    return item.id !== categoryId;
  });
  saveState();
  renderApp();
  closeCategoryModal();
}

function moveCategoryItems(oldCategoryId, newCategoryId, listRecord) {
  listRecord.items.forEach(function(item) {
    if (item.categoryId === oldCategoryId) {
      item.categoryId = newCategoryId;
    }
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
    getCategories(currentList).forEach(function(category) {
      var option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      editCategory.appendChild(option);
    });
    editCategory.value = item.categoryId;

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
      item.categoryId = normalizeCategory(editCategory.value, currentList.categories);
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
    getCategories(activeList).forEach(function(category) {
      renderEmptyCategory(category.name);
    });
    updateCount();
    return;
  }

  getCategories(activeList).forEach(function(category) {
    var categoryItems = activeList.items.filter(function(item) {
      return item.categoryId === category.id;
    });
    var group = document.createElement('li');
    group.className = 'category-group';

    var heading = document.createElement('h2');
    heading.className = 'category-heading';
    heading.textContent = category.name;

    var groupedList = document.createElement('ul');
    groupedList.className = 'category-items';

    if (categoryItems.length === 0) {
      var emptyItem = document.createElement('li');
      emptyItem.className = 'empty-state';
      emptyItem.textContent = 'No items in this category';
      groupedList.appendChild(emptyItem);
    } else {
      categoryItems.slice(0).sort(function(first, second) {
        return first.text.localeCompare(second.text, 'pl', { sensitivity: 'base' });
      }).forEach(function(item) {
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

  var categoryIds = {};
  var categories = activeList.categories.map(function(category) {
    var copy = copyRecord(category);
    copy.id = createId('category');
    categoryIds[category.id] = copy.id;
    return copy;
  });
  var duplicatedList = {
    id: createId('list'),
    name: trimmedName,
    tripDetails: normalizeTripDetails(activeList.tripDetails),
    categories: categories,
    items: activeList.items.map(function(item) {
      var copy = copyRecord(item);
      copy.id = createId('item');
      copy.packed = false;
      copy.categoryId = categoryIds[item.categoryId];
      return copy;
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
  var selectedCategory = normalizeCategory(categorySelect.value, activeList.categories);

  if (!text) {
    input.focus();
    return;
  }

  activeList.items.unshift({
    id: createId('item'),
    text: text,
    packed: false,
    categoryId: selectedCategory
  });

  input.value = '';
  selectedCategoryByListId[activeList.id] = selectedCategory;
  categorySelect.value = selectedCategory;
  input.focus();
  saveState();
  renderApp();
});

listSelect.addEventListener('change', function(event) {
  var previousList = getActiveList();
  if (previousList && getCategoryById(categorySelect.value, previousList.categories)) {
    selectedCategoryByListId[previousList.id] = categorySelect.value;
  }
  appState.activeListId = event.target.value;
  saveState();
  renderApp();
});

categorySelect.addEventListener('change', function() {
  var activeList = getActiveList();
  if (activeList && getCategoryById(categorySelect.value, activeList.categories)) {
    selectedCategoryByListId[activeList.id] = categorySelect.value;
  }
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
  var activeList = getActiveList();
  var categoryToDelete = pendingCategoryToDelete;
  var targetCategory = moveCategorySelect.value;

  if (!categoryToDelete || !targetCategory || targetCategory === categoryToDelete ||
      !getCategoryById(categoryToDelete, activeList.categories) ||
      !getCategoryById(targetCategory, activeList.categories)) {
    closeMoveCategoryModal();
    return;
  }

  moveCategoryItems(categoryToDelete, targetCategory, activeList);
  activeList.categories = activeList.categories.filter(function(category) {
    return category.id !== categoryToDelete;
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
