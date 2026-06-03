function showTab(event, tabId) {
    if (event) {
        event.preventDefault();
    }
    
    // Hide all contents
    const contents = document.querySelectorAll('.circular-content');
    contents.forEach(content => {
        content.style.display = 'none';
    });

    // Remove active class from all menu items
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.classList.remove('active');
    });

    // Show selected content
    document.getElementById(`content-${tabId}`).style.display = 'flex';

    // Add active class to clicked menu item
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}
