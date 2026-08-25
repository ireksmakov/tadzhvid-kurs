const STORAGE_KEY = "tajwidCourseProgress";
const THEME_KEY = "tajwidCourseThemeV2";
const AVAILABLE_THEMES = ["dawn", "blue", "turquoise", "lime", "purple", "sunset"];

const defaultState = {
  visitedSections: [],
  testPassed: false,
  nextLessonUnlocked: false,
  examPassed: false,
  examScore: 0,
  progress: 0
};

function readState() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return { ...defaultState };
    }

    const parsed = JSON.parse(saved);
    return {
      ...defaultState,
      ...parsed,
      visitedSections: Array.isArray(parsed.visitedSections) ? parsed.visitedSections : []
    };
  } catch (error) {
    return { ...defaultState };
  }
}

let state = readState();

function readTheme() {
  try {
    const savedTheme = window.localStorage.getItem(THEME_KEY);
    return AVAILABLE_THEMES.includes(savedTheme) ? savedTheme : "dawn";
  } catch (error) {
    return "dawn";
  }
}

function saveState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function saveTheme(theme) {
  window.localStorage.setItem(THEME_KEY, theme);
}

function updateStatusMessage(element, message, type) {
  element.textContent = message;
  element.classList.remove("is-success", "is-error");

  if (type) {
    element.classList.add(type === "success" ? "is-success" : "is-error");
  }
}

function applyTheme(theme) {
  const safeTheme = AVAILABLE_THEMES.includes(theme) ? theme : "dawn";

  document.body.setAttribute("data-theme", safeTheme);

  document.querySelectorAll(".theme-chip").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.theme === safeTheme);
  });

  saveTheme(safeTheme);
}

function getCompletedSteps() {
  const sectionSteps = ["modules", "alphabet", "video", "rules", "practice"];
  let completed = 0;

  sectionSteps.forEach((step) => {
    if (state.visitedSections.includes(step)) {
      completed += 1;
    }
  });

  if (state.testPassed) {
    completed += 1;
  }

  if (state.examPassed) {
    completed += 1;
  }

  return completed;
}

function updateProgressUI() {
  const totalSteps = 7;
  const completedSteps = getCompletedSteps();
  const progress = Math.round((completedSteps / totalSteps) * 100);
  state.progress = progress;
  saveState();

  const progressValue = document.getElementById("progress-value");
  const topProgressValue = document.getElementById("top-progress-value");
  const progressBarFill = document.getElementById("progress-bar-fill");
  const progressStatus = document.getElementById("progress-status");
  const progressLegend = document.getElementById("progress-legend");

  progressValue.textContent = `${progress}%`;
  topProgressValue.textContent = `${progress}%`;
  progressBarFill.style.width = `${progress}%`;

  if (progress === 0) {
    progressStatus.textContent = "Начало пути";
    progressLegend.textContent = "Изучайте материалы, проходите тест и открывайте следующий этап.";
  } else if (progress < 50) {
    progressStatus.textContent = "Уверенный старт";
    progressLegend.textContent = "Теория уже открыта, продолжайте двигаться к тесту и экзамену.";
  } else if (progress < 100) {
    progressStatus.textContent = "Хороший темп";
    progressLegend.textContent = "Основная часть курса позади, осталось закрепить результат экзаменом.";
  } else {
    progressStatus.textContent = "Модуль завершён";
    progressLegend.textContent = "Поздравляем! Вы завершили базовый модуль и можете повторить материал для укрепления навыка.";
  }

  const milestones = {
    modules: document.getElementById("milestone-modules"),
    alphabet: document.getElementById("milestone-alphabet"),
    video: document.getElementById("milestone-video"),
    rules: document.getElementById("milestone-rules"),
    practice: document.getElementById("milestone-practice")
  };

  Object.entries(milestones).forEach(([key, element]) => {
    element.classList.toggle("is-complete", state.visitedSections.includes(key));
  });

  document
    .getElementById("milestone-test")
    .classList.toggle("is-complete", state.testPassed);
  document
    .getElementById("milestone-exam")
    .classList.toggle("is-complete", state.examPassed);
}

function unlockExamUI() {
  const nextLessonButton = document.getElementById("next-lesson-button");
  const examFieldset = document.getElementById("exam-fieldset");
  const examButton = document.getElementById("check-exam-button");
  const examLock = document.getElementById("exam-lock-message");
  const moduleFive = document.querySelector('[data-lesson="5"]');

  nextLessonButton.disabled = false;
  examFieldset.disabled = false;
  examButton.disabled = false;
  examLock.textContent = "Экзамен открыт. Ответьте правильно на итоговый вопрос для зачёта.";
  examLock.classList.add("is-open");
  moduleFive.classList.remove("is-locked");
  moduleFive.querySelector(".pill").textContent = "Открыт";
  moduleFive.querySelector(".pill").classList.remove("pill--locked");
  moduleFive.querySelector(".pill").classList.add("pill--success");
}

function restoreTestAndExamState() {
  if (state.testPassed || state.nextLessonUnlocked) {
    unlockExamUI();
    updateStatusMessage(
      document.getElementById("test-message"),
      "Тест пройден. Следующий урок уже открыт.",
      "success"
    );
  }

  if (state.examPassed) {
    updateStatusMessage(
      document.getElementById("exam-message"),
      "Экзамен уже сдан. Итоговый вопрос выполнен правильно.",
      "success"
    );
  }
}

function markSectionVisited(sectionName) {
  if (state.visitedSections.includes(sectionName)) {
    return;
  }

  state.visitedSections = [...state.visitedSections, sectionName];
  saveState();
  updateProgressUI();
}

function collectAnswers(containerSelector) {
  const questions = document.querySelectorAll(`${containerSelector} .quiz-question`);

  return Array.from(questions).map((question) => {
    const selected = question.querySelector('input[type="radio"]:checked');
    const answer = selected ? selected.value : "";

    return {
      selected: answer,
      correct: question.dataset.correct
    };
  });
}

function handleTestCheck() {
  const answers = collectAnswers("#test");
  const allCorrect = answers.every((item) => item.selected && item.selected === item.correct);
  const messageElement = document.getElementById("test-message");

  if (allCorrect) {
    state.testPassed = true;
    state.nextLessonUnlocked = true;
    unlockExamUI();
    updateStatusMessage(
      messageElement,
      "Тест пройден успешно. Кнопка «Следующий урок» теперь доступна.",
      "success"
    );
  } else {
    updateStatusMessage(messageElement, "Повтори урок и попробуй снова", "error");
  }

  saveState();
  updateProgressUI();
}

function handleNextLesson() {
  const examSection = document.getElementById("exam");
  const moduleFive = document.querySelector('[data-lesson="5"]');

  moduleFive.classList.add("is-active");
  examSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function handleExamCheck() {
  const answers = collectAnswers("#exam-fieldset");
  const correctAnswers = answers.filter(
    (item) => item.selected && item.selected === item.correct
  ).length;
  const totalQuestions = answers.length;
  const score = Math.round((correctAnswers / totalQuestions) * 100);
  const messageElement = document.getElementById("exam-message");

  state.examScore = score;

  if (score >= 70) {
    state.examPassed = true;
    updateStatusMessage(
      messageElement,
      "Экзамен сдан. Итоговый вопрос выполнен правильно.",
      "success"
    );
  } else {
    state.examPassed = false;
    updateStatusMessage(
      messageElement,
      "Ответ неверный. Повторите материал и попробуйте снова.",
      "error"
    );
  }

  saveState();
  updateProgressUI();
}

function setupSectionObserver() {
  const observedSections = document.querySelectorAll("[data-progress-section]");

  if (!("IntersectionObserver" in window)) {
    observedSections.forEach((section) => markSectionVisited(section.dataset.progressSection));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          markSectionVisited(entry.target.dataset.progressSection);
        }
      });
    },
    {
      threshold: 0.35
    }
  );

  observedSections.forEach((section) => observer.observe(section));
}

function setupThemeControls() {
  const currentTheme = readTheme();
  applyTheme(currentTheme);

  document.querySelectorAll(".theme-chip").forEach((button) => {
    button.addEventListener("click", () => {
      applyTheme(button.dataset.theme);
    });
  });
}

function setupFloatingButtons() {
  const scrollTopButton = document.getElementById("scroll-top-button");

  function updateScrollButtonVisibility() {
    scrollTopButton.classList.toggle("is-visible", window.scrollY > 220);
  }

  scrollTopButton.addEventListener("click", () => {
    if (typeof window.scrollTo === "function") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  });

  window.addEventListener("scroll", updateScrollButtonVisibility, { passive: true });
  updateScrollButtonVisibility();
}

function setupPaletteToggle() {
  const paletteToggleButton = document.getElementById("palette-toggle-button");
  const themePanel = document.getElementById("theme-switcher-panel");

  if (!paletteToggleButton || !themePanel) {
    return;
  }

  paletteToggleButton.addEventListener("click", () => {
    themePanel.classList.toggle("is-open");
    paletteToggleButton.setAttribute(
      "aria-expanded",
      themePanel.classList.contains("is-open") ? "true" : "false"
    );
  });

  document.querySelectorAll(".theme-chip").forEach((button) => {
    button.addEventListener("click", () => {
      themePanel.classList.remove("is-open");
      paletteToggleButton.setAttribute("aria-expanded", "false");
    });
  });

  document.addEventListener("click", (event) => {
    if (
      !themePanel.contains(event.target) &&
      !paletteToggleButton.contains(event.target)
    ) {
      themePanel.classList.remove("is-open");
      paletteToggleButton.setAttribute("aria-expanded", "false");
    }
  });
}

function init() {
  document
    .getElementById("check-test-button")
    .addEventListener("click", handleTestCheck);
  document
    .getElementById("next-lesson-button")
    .addEventListener("click", handleNextLesson);
  document
    .getElementById("check-exam-button")
    .addEventListener("click", handleExamCheck);

  restoreTestAndExamState();
  updateProgressUI();
  setupSectionObserver();
  setupThemeControls();
  setupFloatingButtons();
  setupPaletteToggle();
}

document.addEventListener("DOMContentLoaded", init);
