let shouldAddQuotedRepliesButton = (article) => {
    return !article.classList.contains('qtr-icon-added');
};

let getElementCssStyle = (element, attribute) => {
    if (!element) {
        return '';
    }
    let computedStyle = window.getComputedStyle(element);
    return computedStyle.getPropertyValue(attribute);
}

let addQuotedRepliesToDom = (retweetButton, quotedRepliesButton) => {
    retweetButton.parentNode.parentNode.parentNode.parentNode.insertBefore(quotedRepliesButton, retweetButton.parentNode.parentNode.parentNode);
};

let getUsername = (article) => {
    return article.querySelector('[data-testid="User-Name"]')
        .querySelector('a')
        .href.split('/')
        .pop() || 'xxx';
};

let getHrefs = (article) => {
    return Array.from(article.querySelectorAll('a[href*=status]'))
        .map((el) => el.href);
};

let getStatusHrefs = (hrefs, username) => {
    return hrefs?.filter((href) => href.match(`https:\/\/(?:twitter|x).com\/${username}\/status\/[0-9]+`));
};

let getStatusIdFromHrefs = (statusHrefs) => {
    return statusHrefs
        .shift()
        .match(/https:\/\/(?:twitter|x).com\/[a-zA-Z0-9_]+\/status\/([0-9]+)/) // regex to get and capture status id
        .pop();
};

let getStatusId = (article) => {
    let username = getUsername(article);
    let hrefs = getHrefs(article);
    let statusHrefs = getStatusHrefs(hrefs, username);
    let statusId = getStatusIdFromHrefs(statusHrefs);
    return statusId;
};

let createQuotedRepliesButton = (article) => {
    const container = document.createElement('div');
    const username = getUsername(article);
    const statusId = getStatusId(article);

    const retweetIcon = article.querySelector('[data-testid="retweet"] svg, [data-testid="unretweet"] svg').outerHTML;
    const buttonColor = getElementCssStyle(article.querySelector('[data-testid="reply"] svg'), 'color');

    const borderColor = getElementCssStyle(article.querySelector('[data-testid="bookmark"]')
                .parentNode.parentNode, 'border-top-color');
    const fontSize = getElementCssStyle(article.querySelector('[data-testid="app-text-transition-container"]')
                .parentNode.nextElementSibling, 'font-size');
    const fontFamily = getElementCssStyle(article.querySelector('[data-testid="app-text-transition-container"]'),
                'font-family').replaceAll('"', '');

    const retweetCount = article.querySelector('[data-testid="retweet"], [data-testid="unretweet"]').textContent || 0;
    const likeCount = article.querySelector('[data-testid="like"], [data-testid="unlike"]').textContent || 0;

    container.innerHTML = `
        <div class="twitter-quotes-options" style="border-top-color: ${borderColor}; font-size: ${fontSize};">
            <a href="/${username}/status/${statusId}/retweets"
                    class="twitter-quotes-option twitter-quotes-option-retweets "
                    style="color: ${buttonColor}; font-family: ${fontFamily};"
                    title="${chrome.i18n.getMessage("twitterQuotesRetweetTitle")}">
                <span class="twitter-quotes-option-number">${retweetCount}</span>
                <span>${chrome.i18n.getMessage("twitterQuotesRetweet")}<span>
            </a>
            <a href="/${username}/status/${statusId}/quotes"
                    class="twitter-quotes-option twitter-quotes-option-quotes "
                    style="color: ${buttonColor}; font-family: ${fontFamily};"
                    title="${chrome.i18n.getMessage("twitterQuotesQuotesTitle")}">
                ${retweetIcon}
                <span>${chrome.i18n.getMessage("twitterQuotesQuotes")}</span>
            </a>
            <a href="/${username}/status/${statusId}/likes"
                    class="twitter-quotes-option twitter-quotes-option-likes "
                    style="color: ${buttonColor}; font-family: ${fontFamily};"
                    title="${chrome.i18n.getMessage("twitterQuotesLikesTitle")}">
                <span class="twitter-quotes-option-number">${likeCount}</span>
                <span>${chrome.i18n.getMessage("twitterQuotesLikes")}</span>
            </a>
        </div>
    `;
    return container;
};

let addExtensionFeaturesToTweetArticle = (node) => {
    let article = node.querySelector('article[data-testid="tweet"][tabindex="-1"]');
    if (article) {
        if (shouldAddQuotedRepliesButton(article)) {
            let retweetButton = article.querySelector('[data-testid="retweet"], [data-testid="unretweet"]');
            let quotedRepliesButton = createQuotedRepliesButton(article);
            addQuotedRepliesToDom(retweetButton, quotedRepliesButton);
            article.classList.add('qtr-icon-added');
        }
    }
};

let updateNumbers = (target, node) => {
    let targetButton = node.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.querySelector(target);
    if (targetButton) {
        // Timeout of 1ms to let the number get updated in DOM
        setTimeout(() => {
            const newNumber = node.parentNode.querySelector('[data-testid="app-text-transition-container"]')?.textContent || 0;
            const previousNumber = targetButton.textContent

            if (newNumber !== previousNumber) {
                targetButton.classList.add('twitter-quotes-animate-fadeout');
                setTimeout(() => {
                    targetButton.textContent = newNumber;
                    targetButton.classList.add('twitter-quotes-animate-slide-up');
                    targetButton.addEventListener('animationend', () => {
                        targetButton.classList.remove('twitter-quotes-animate-fadeout', 'twitter-quotes-animate-slide-up');
                    }, {
                        once: true
                    });
                }, 200);
            }
        }, 1);
    }
};

let startTwitterQuotes = () => {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (!node.querySelector) {
                        return;
                    }

                    const theParentNode = node?.parentNode?.parentNode?.parentNode;
                    if (theParentNode instanceof HTMLElement) {
                        const dataTestId = theParentNode.getAttribute('data-testid');
                        switch (dataTestId) {
                            case 'like':
                            case 'unlike':
                                updateNumbers('.twitter-quotes-option-likes .twitter-quotes-option-number', theParentNode);
                                break;
                            case 'retweet':
                            case 'unretweet':
                                updateNumbers('.twitter-quotes-option-retweets .twitter-quotes-option-number', theParentNode);
                                break;
                            default:
                                addExtensionFeaturesToTweetArticle(node);
                                break;
                        }
                    }
                });
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
};

startTwitterQuotes();
