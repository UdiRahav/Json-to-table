// Google Analytics Configuration
function initializeAnalytics() {
    // Google Analytics 4 initialization code
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=MEASUREMENT_ID'; // Replace MEASUREMENT_ID with your GA4 ID
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag() {
        dataLayer.push(arguments);
    }
    gtag('js', new Date());
    gtag('config', 'MEASUREMENT_ID'); // Replace MEASUREMENT_ID with your GA4 ID

    // Custom event tracking
    trackAppUsage();
}

function trackAppUsage() {
    // Track JSON conversions
    document.getElementById('convertBtn').addEventListener('click', () => {
        gtag('event', 'convert_json', {
            'event_category': 'Usage',
            'event_label': 'Convert Button Click'
        });
    });

    // Track file uploads
    document.getElementById('uploadBtn').addEventListener('click', () => {
        gtag('event', 'upload_json', {
            'event_category': 'Usage',
            'event_label': 'Upload Button Click'
        });
    });

    // Track column searches
    const searchInput = document.getElementById('factSearch');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            gtag('event', 'search_columns', {
                'event_category': 'Usage',
                'event_label': 'Column Search',
                'search_term': searchInput.value
            });
        });
    }

    // Track downloads
    document.getElementById('downloadCSV').addEventListener('click', () => {
        gtag('event', 'download_excel', {
            'event_category': 'Usage',
            'event_label': 'Excel Download'
        });
    });

    // Track markdown copies
    document.getElementById('copyMarkdown').addEventListener('click', () => {
        gtag('event', 'copy_markdown', {
            'event_category': 'Usage',
            'event_label': 'Copy Markdown'
        });
    });
}
