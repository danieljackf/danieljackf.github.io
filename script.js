document.addEventListener('DOMContentLoaded', () => {
  const revealItems = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealItems.forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index * 70, 350)}ms`;
    revealObserver.observe(item);
  });

  const filterButtons = document.querySelectorAll('.filter-button');
  const projects = document.querySelectorAll('.project');
  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      filterButtons.forEach((item) => item.classList.toggle('active', item === button));
      projects.forEach((project) => {
        const categories = project.dataset.category.split(' ');
        project.classList.toggle('is-hidden', filter !== 'all' && !categories.includes(filter));
      });
    });
  });
});