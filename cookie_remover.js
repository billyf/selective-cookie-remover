var cookieRemover = {
    removeCookies: function (mockRun) {
        feedback.updateHeader(mockRun ? "Matching cookies (not removed):" : "Cookies removed:");
        feedback.clearOutputList();

        var domainsToRemove = domainRows.getDomainList(true);
        for (var i in domainsToRemove) {
            this.removeCookiesFromDomain(domainsToRemove[i], mockRun);
        }
    },

    removeCookiesFromDomain: function (domain, mockRun) {
        chrome.cookies.getAll({"domain": domain}, function (arrayOfCookies) {
            var previousUrl = "";
            for (var i in arrayOfCookies) {
                var cookie = arrayOfCookies[i];
                var domain = (cookie.domain[0] == '.' ? cookie.domain.substring(1) : cookie.domain);
                var url = "http" + (cookie.secure ? "s" : "") + "://" + domain + cookie.path;
                console.log("match: URL = " + url + "\t NAME = " + cookie.name);

                if (url == previousUrl) {
                    feedback.appendToLastUILine(cookie.name);
                } else {
                    feedback.addUILine(url + "<br>&nbsp;&nbsp;" + cookie.name);
                }
                previousUrl = url;

                if (!mockRun) {
                    chrome.cookies.remove({"url": url, "name": cookie.name});
                }
            }
        });
    }
};

var feedback = {
    addUILine: function (msg) {
        $("#outputList").append(
            $('<li>').append(
                $('<span>').append(msg)));
    },
    appendToLastUILine: function (name) {
        $("#outputList li").last().append(
            $('<span>').append("<br>&nbsp;&nbsp;" + name));
    },
    updateHeader: function (text) {
        $("#outputHeader").text(text);
    },
    clearOutputList: function() {
        $("#outputList").empty();
    }
};

var domainRows = {
    addRow: function (domainText) {
        var newRow = '<span class="domainSpan">'
            + '<input type="checkbox" class="cookieCheckbox" checked />'
            + '<input type="text" value="' + domainText + '" />'
            + '<a href="#" class="removeRow"><img src="img/minus.png"/></a>'
            + '<br/></span>';
        $("#addRow").before(newRow);
    },

    addBlankRow: function () {
        domainRows.addRow("");
    },

    getDomainList: function(onlyChecked) {
        var spans;
        if (onlyChecked) {
            spans = $("span.domainSpan input:checked").parent().find("input:text");
        } else {
            spans = $("span.domainSpan input:text");
        }
        return $.map(spans, function (el) { return $(el).val() });
    }
};

var storage = {
    saveIsQueued: false,

    needsSaving: function() {
        // to avoid saving on every keystroke
        if (!this.saveIsQueued) {
            storage.saveIsQueued = true;
            setTimeout(storage.saveDomainList, 2000);
        }
    },

    saveDomainList: function () {
        storage.saveIsQueued = false;
        var domainListArr = domainRows.getDomainList(false);
        chrome.storage.sync.set({'domainList': domainListArr}, function () {
            console.log("domainList saved");
        });
    },

    loadDomainList: function () {
        chrome.storage.sync.get('domainList', function (savedData) {
            console.log("domainList loaded");
            for (var i in savedData.domainList) {
                domainRows.addRow(savedData.domainList[i]);
            }
            // remove the default if real data was retrieved
            if (savedData.domainList && savedData.domainList.length) {
                $("#defaultDomainSpan").remove();
            }
        });
    }
};

$(document).ready(function(){
    console.log("cookie-remover document ready");
    
    $("#removeCookies").click(function () {
        console.log("removeCookies click");
        cookieRemover.removeCookies($("#mockRun").is(":checked"));
        return false;
    });
    
    $("#addRow").click(domainRows.addBlankRow);

    $("#mockRun").on("change", function() {
        var isChecked = $(this).is(":checked");
        $("#removeCookies").val(isChecked ? "Find matching cookies" : "Remove cookies");
    });
    
    $(document).on("click", "a.removeRow", function () {
        $(this).parent().remove();
        storage.saveDomainList();
    });
    
    $(document).on("input", "span.domainSpan input:text", function() {
        storage.needsSaving();
    });
    
    storage.loadDomainList();
});
