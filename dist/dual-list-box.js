/**
 * jQuery DualListBox plugin with Bootstrap styling v1.0
 * http://www.geodan.nl
 *
 * Copyright (c) 2014 Geodan B.V.
 * Created by: Alex van den Hoogen
 * Forked by: Patrick Fust (https://github.com/patrickfust/DualListBox)
 * Forked by: Florian Feigenbutz (https://github.com/smileback-com/DualListBox)
 *
 * Usage:
 *   Create a <select> and apply this script to that select via jQuery like so:
 *   $('select').DualListBox(); - the DualListBox will than be created for you.
 *
 *   Options and parameters can be provided through html5 data-* attributes or
 *   via a provided JavaScript object. Optionally already selected items can
 *   also be provided and this script can download the JSON to fill the
 *   DualListBox when a valid URI is provided.
 *
 *   See the default parameters (below) for a complete list of options.
 */

(function($) {
    var _locked = false,
        _parentElement = undefined;

    /** Initializes the DualListBox code as jQuery plugin. */
    $.fn.DualListBox = function(paramOptions, selected) {
        return this.each(function () {
            var defaults = {
                element:    this,    // Select element which creates this dual list box.
                uri:        'local.json',       // JSON file that can be opened for the data.
                value:      'id',               // Value that is assigned to the value field in the option.
                text:       'name',             // Text that is assigned to the option field.
                title:      'Example',          // Title of the dual list box.
                json:       true,               // Whether to retrieve the data through JSON.
                timeout:    500,                // Timeout for when a filter search is started.
                horizontal: false,              // Whether to layout the dual list box as horizontal or vertical.
                textLength: 45,                 // Maximum text length that is displayed in the select.
                moveAllBtn: true,               // Whether the append all button is available.
                maxAllBtn:  500,                // Maximum size of list in which the all button works without warning. See below.
                iconSet: 'glyphicon',           // Icon set: glyphicon or fontawesome
                selectClass:'form-control',
                warning:    'Are you sure you want to move this many items? Doing so can cause your browser to become unresponsive.',
                availableText: 'Available',
                selectedText: 'Selected',
                beforeCount: '- ',
                afterCount: '',
                maxSelectable: undefined,
                showingText: 'showing',
                filterText: 'Filter',
                sort:       'case-insensitive',
                changeCallback: function() {}   // Callback function when the selected elements changes
            };

            var htmlOptions = {
                element:      this,
                uri:          $(this).data('source'),
                value:        $(this).data('value'),
                text:         $(this).data('text'),
                title:        $(this).data('title'),
                json:         $(this).data('json'),
                timeout:      $(this).data('timeout'),
                horizontal:   $(this).data('horizontal'),
                textLength:   $(this).data('textLength'),
                moveAllBtn:   $(this).data('moveAllBtn'),
                maxAllBtn:    $(this).data('maxAllBtn'),
                iconSet:      $(this).data('iconSet'),
                selectClass:  $(this).data('selectClass'),
                availableText:$(this).data('availableText'),
                selectedText: $(this).data('selectedText'),
                beforeCount:  $(this).data('beforeCount'),
                afterCount:   $(this).data('afterCount'),
                maxSelectable:$(this).data('maxSelectable'),
                showingText:  $(this).data('showingText'),
                filterText:   $(this).data('filterText'),
                sort:         $(this).data('sort'),
                id:           $(this).attr('id')
            };

            var options = $.extend({}, defaults, htmlOptions, paramOptions);

            $.each(options, function(i, item) {
                if (item === undefined || item === null) { throw 'DualListBox: ' + i + ' is undefined.'; }
            });

            options['parent'] = 'dual-list-box-' + options.title.replace(/ /g, '_');
            options['parentElement'] = '#' + options.parent;
            _parentElement = options['parentElement'];

            selected = $.extend([{}], selected);
            $.each(options.element.options, function(idx, anOption) {selected.push(anOption.value); });

            if (options.json) {
                addElementsViaJSON(options, selected);
            } else {
                construct(options);
            }
        })
    };

    /** Retrieves all the option elements through a JSON request. */
    function addElementsViaJSON(options, selected) {
        var multipleTextFields = false;

        if (options.text.indexOf(':') > -1) {
            var textToUse = options.text.split(':');

            if (textToUse.length > 1) {
                multipleTextFields = true;
            }
        }
        $.getJSON(options.uri, function(json) {
            $.each(json, function(key, item) {
                var text = '';

                if (multipleTextFields) {
                    textToUse.forEach(function (entry) { text += item[entry] + ' '; });
                } else {
                    text = item[options.text];
                }

                var isSelected = (selected.some(function (e) { return e[options.value] === item[options.value] || e === item[options.value] }) === true);
                if (!isSelected) {
                    $('<option>', {
                        value: item[options.value],
                        text: text,
                        selected: isSelected
                    }).appendTo(options.element);
                } else { // is already in the options list
                    $(options.element).find("option[value=" + item[options.value] + "]").attr("selected", true);
                }
            });
            construct(options);
        });
    }

    /** Adds the event listeners to the buttons and filters. */
    function addListeners(options) {
        var unselected = $(options.parentElement + ' .unselected');
        var selected = $(options.parentElement + ' .selected');

        function afterOptionMoved() {
            unselected.filterByText($(options.parentElement + ' .filter-unselected'), options.timeout, options.parentElement).scrollTop(0).sortOptions(options);
            selected.filterByText($(options.parentElement + ' .filter-selected'), options.timeout, options.parentElement).scrollTop(0).sortOptions(options);

            handleMovement(options);

            selected.trigger('change');
        }

        $(options.parentElement).find('button').bind('click', function() {
            if (isLocked()) {
                return;
            }

            switch ($(this).data('type')) {
                case 'str': /* Selected to the right. */
                    unselected.find('option:selected').appendTo(selected);
                    $(this).prop('disabled', true);
                    break;
                case 'atr': /* All to the right. */
                    if (unselected.find('option').length >= options.maxAllBtn && confirm(options.warning) ||
                        unselected.find('option').length < options.maxAllBtn) {
                        unselected.find('option').each(function () {
                            if ($(this).isVisible()) {
                                $(this).remove().appendTo(selected);
                            }
                        });
                    }
                    break;
                case 'stl': /* Selected to the left. */
                    selected.find('option:selected').remove().appendTo(unselected);
                    $(this).prop('disabled', true);
                    break;
                case 'atl': /* All to the left. */
                    if (selected.find('option').length >= options.maxAllBtn && confirm(options.warning) ||
                        selected.find('option').length < options.maxAllBtn) {
                        selected.find('option').each(function () {
                            if ($(this).isVisible()) {
                                $(this).remove().appendTo(unselected);
                            }
                        });
                    }
                    break;
                default: break;
            }
            afterOptionMoved();
        });

        $(options.parentElement).closest('form').submit(function() {
            selected.find('option').prop('selected', true);
        });

        $(options.parentElement).find('input[type="text"]').keypress(function(e) {
            if (e.which === 13) {
                event.preventDefault();
            }
        });

        $(options.parentElement).find('select').on('dblclick', function() {
            var $this = $(this),
                $selectedOption = $this.find('option:selected');

            if (isLocked()) {
                return;
            }

            if ($this.hasClass('unselected')) {
                $selectedOption.appendTo(selected).attr('selected', false);
            } else if ($this.hasClass('selected')) {
                $selectedOption.appendTo(unselected).attr('selected', false);
            }
            afterOptionMoved();
        });

        selected.filterByText($(options.parentElement + ' .filter-selected'), options.timeout, options.parentElement).scrollTop(0).sortOptions(options);
        unselected.filterByText($(options.parentElement + ' .filter-unselected'), options.timeout, options.parentElement).scrollTop(0).sortOptions(options);
    }

    /** Constructs the jQuery plugin after the elements have been retrieved. */
    function construct(options) {
        createDualListBox(options);
        parseStubListBox(options);
        addListeners(options);
    }

    /** Counts the elements per list box/select and shows it. */
    function countElements(parentElement) {
        var countUnselected = 0, countSelected = 0, $small = $(parentElement + ' .selected-title+small');

        function getMaxSelectable() {
            return parseInt($small.attr('data-max-selectable'));
        }

        function hasMaxSelectable() {
            return getMaxSelectable() !== undefined && getMaxSelectable() > 0;
        }

        function hasExceededMaxSelectable(countSelected) {
            return hasMaxSelectable() && countSelected > getMaxSelectable();
        }

        $(parentElement + ' .unselected').find('option').each(function() { if ($(this).isVisible()) { countUnselected++; } });
        $(parentElement + ' .selected').find('option').each(function() { if ($(this).isVisible()) { countSelected++ } });

        $(parentElement + ' .unselected-count').text(countUnselected);
        $(parentElement + ' .selected-count').text(countSelected);

        if (hasExceededMaxSelectable(countSelected)) {
            $small.css('color', '#f00');
            $small.parents('h4').css('color', '#f00');
        } else {
            $small.css('color', '');
            $small.parents('h4').css('color', '');
        }

        toggleButtons(parentElement);
    }

    function countArea(type, options, className) {
        function hasMaxSelectable() {
            return type === 'selected' && options.maxSelectable && options.maxSelectable > 0;
        }
        function dataAttribute() {
            return hasMaxSelectable() ? 'data-max-selectable="' + options.maxSelectable + '"' : '';
        }

        return '<small ' + dataAttribute() + '> '
            + options.beforeCount
                + options.showingText
                + '<span class="' + className + '"></span>'
            + (hasMaxSelectable() ? ' of <span class="max-selectable">' + options.maxSelectable + '</span>' : '')
            + options.afterCount
            + '</small>';
    }

    /** Creates a new dual list box with the right buttons and filter. */
    function createDualListBox(options) {
        $(options.element).parent().attr('id', options.parent);
        var idForInput = options.id != null ? " id='" + options.id + "'" : "";
        $(options.parentElement).addClass('row').append(
            '<style>.dual-list-box-container button.btn { line-height: 1em; } @media (max-width: 767px) { .dual-list-box-container button.btn { padding: 10px; transform: rotate(90deg); width: 40px; height: 40px; margin-left: 10px; } } @media (min-width: 992px) and (max-width: 1400px) { .dual-list-box-container button.btn { min-width: 25px; padding-left: 5px; padding-right: 5px; } }</style>' +
            (options.horizontal == false ? '   <div class="col-md-5 col-sm-12 col-12">' : '   <div class="col-md-6">') +
            '       <h4><span class="unselected-title"></span> ' + countArea('unselected', options, 'unselected-count') + '</h4>' +
            '       <input class="filter form-control filter-unselected" type="text" placeholder="' + options.filterText + '" style="margin-bottom: 5px;">' +
            (options.horizontal == false ? '' : createHorizontalButtons(1, options.moveAllBtn, getButtonClasses(options.iconSet))) +
            '       <select class="unselected ' + options.selectClass + '" style="height: 200px; width: 100%;" multiple></select>' +
            '   </div>' +
            (options.horizontal == false ? createVerticalButtons(options.moveAllBtn, getButtonClasses(options.iconSet)) : '') +
            (options.horizontal == false ? '   <div class="col-md-5 col-sm-12 col-12">' : '   <div class="col-md-6">') +
            '       <h4><span class="selected-title"></span> ' + countArea('selected', options, 'selected-count') + '</h4>' +
            '       <input class="filter form-control filter-selected" type="text" placeholder="' + options.filterText + '" style="margin-bottom: 5px;">' +
            (options.horizontal == false ? '' : createHorizontalButtons(2, options.moveAllBtn, getButtonClasses(options.iconSet))) +
            '       <select class="selected ' + options.selectClass + '" style="height: 200px; width: 100%;" multiple ' + idForInput+ '></select>' +
            '   </div>');

        $(options.parentElement + ' .selected').prop('name', $(options.element).prop('name'));
        $(options.parentElement + ' .unselected-title').text(options.availableText + ' ' + options.title);
        $(options.parentElement + ' .selected-title').text(options.selectedText + ' ' + options.title);

        $("[" + idForInput + "]").change(function(eventObject) {
            if (isLocked()) {
                return;
            }
            options.changeCallback(eventObject)
        });
    }

    /** Creates the buttons when the dual list box is set in horizontal mode. */
    function createHorizontalButtons(number, copyAllBtn, buttonClass) {
        if (number == 1) {
            return (copyAllBtn ? '       <button type="button" class="btn btn-default atr" data-type="atr" style="margin-bottom: 5px"><span class="'+buttonClass.addAll+'"></span></button>': '') +
                '       <button type="button" class="btn btn-default ' + (copyAllBtn ? 'pull-right col-md-6' : 'col-md-12') + ' str" data-type="str" style="margin-bottom: 5px;" disabled><span class="'+buttonClass.addSelected+'"></span></button>';
        } else {
            return '       <button type="button" class="btn btn-default ' + (copyAllBtn ? 'col-md-6' : 'col-md-12') + ' stl" data-type="stl" style="margin-bottom: 5px;" disabled><span class="'+buttonClass.removeSelected+'"></span></button>' +
                (copyAllBtn ? '       <button type="button" class="btn btn-default col-md-6 pull-right atl" data-type="atl" style="margin-bottom: 5px;"><span class="'+buttonClass.removeAll+'"></span></button>' : '');
        }
    }

    /** Creates the buttons when the dual list box is set in vertical mode. */
    function createVerticalButtons(copyAllBtn, buttonClass) {
        return '   <div class="col-md-2 col-sm-12 text-center" style="margin-top: ' + (copyAllBtn ? '20px' : '130px') +'">' +
            (copyAllBtn ? '       <button type="button" class="btn btn-outline-secondary col-md-8 col-md-offset-2 atr" data-type="atr" style="margin-bottom: 10px;"><span class="'+buttonClass.addAll+'"></span></button>' : '') +
            '       <button type="button" class="btn btn-outline-secondary col-md-8 col-md-offset-2 str" data-type="str" style="margin-bottom: 10px;" disabled><span class="'+buttonClass.addSelected+'"></span></button>' +
            '       <button type="button" class="btn btn-outline-secondary col-md-8 col-md-offset-2 stl" data-type="stl" style="margin-bottom: 10px;" disabled><span class="'+buttonClass.removeSelected+'"></span></button>' +
            (copyAllBtn ? '       <button type="button" class="btn btn-outline-secondary col-md-8 col-md-offset-2 atl" data-type="atl" style="margin-bottom: 10px;"><span class="'+buttonClass.removeAll+'"></span></button>' : '') +
            '   </div>';
    }
    
    function getButtonClasses(iconSet) {
        if (iconSet === 'fontawesome') {
            return {
                addAll: 'fa fa-angle-double-right',
                addSelected: 'fa fa-angle-right',
                removeSelected: 'fa fa-angle-left',
                removeAll: 'fa fa-angle-double-left'
            };
        } else { // default icon set
            return {
                addAll: 'glyphicon glyphicons-fast-forward',
                addSelected: 'glyphicon glyphicon-chevron-right',
                removeSelected: 'glyphicon glyphicon-chevron-left',
                removeAll: 'glyphicon glyphicons-fast-backward'
            };            
        }
    }

    /** Specifically handles the movement when one or more elements are moved. */
    function handleMovement(options) {
        $(options.parentElement + ' .unselected').find('option:selected').prop('selected', false);
        $(options.parentElement + ' .selected').find('option:selected').prop('selected', false);

        $(options.parentElement + ' .filter').val('');
        $(options.parentElement + ' select').find('option').each(function() { $(this).show(); });

        countElements(options.parentElement);
    }

    /** Parses the stub select / list box that is first created. */
    function parseStubListBox(options) {
        var textIsTooLong = false;

        $(options.element).find('option').text(function (i, text) {
            $(this).data('title', text);

            if (text.length > options.textLength) {
                textIsTooLong = true;
                return text.substr(0, options.textLength) + '...';
            }
        }).each(function () {
            if (textIsTooLong) {
                $(this).prop('title', $(this).data('title'));
            }

            if ($(this).is(':selected')) {
                $(this).appendTo(options.parentElement + ' .selected');
            } else {
                $(this).appendTo(options.parentElement + ' .unselected');
            }
        });

        $(options.element).remove();
        handleMovement(options);
    }

    /** Toggles the buttons based on the length of the selects. */
    function toggleButtons(parentElement) {
        $(parentElement + ' .unselected').change(function() {
            $(parentElement + ' .str').prop('disabled', false);
        });

        $(parentElement + ' .selected').change(function() {
            $(parentElement + ' .stl').prop('disabled', false);
        });

        if ($(parentElement + ' .unselected').has('option').length == 0) {
            $(parentElement + ' .atr').prop('disabled', true);
            $(parentElement + ' .str').prop('disabled', true);
        } else {
            $(parentElement + ' .atr').prop('disabled', false);
        }

        if ($(parentElement + ' .selected').has('option').length == 0) {
            $(parentElement + ' .atl').prop('disabled', true);
            $(parentElement + ' .stl').prop('disabled', true);
        } else {
            $(parentElement + ' .atl').prop('disabled', false);
        }
    }

    /**
     * Filters through the select boxes and hides when an element doesn't match.
     *
     * Original source: http://www.lessanvaezi.com/filter-select-list-options/
     */
    $.fn.filterByText = function(textBox, timeout, parentElement) {
        return this.each(function() {
            var select = this;
            var options = [];

            $(select).find('option').each(function() {
                options.push({value: $(this).val(), text: $(this).text()});
            });

            $(select).data('options', options);

            $(textBox).bind('change keyup', function() {
                RegExp.escape = function( value ) {
                    return value.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
                }

                delay(function() {
                    var options = $(select).data('options');
                    var search = $.trim($(textBox).val());
                    var regex = new RegExp(RegExp.escape(search),'gi');

                    $.each(options, function(i) {
                        if(options[i].text.match(regex) === null) {
                            $(select).find($('option[value="' + options[i].value + '"]')).hide();
                        } else {
                            $(select).find($('option[value="' + options[i].value + '"]')).show();
                        }
                    });

                    countElements(parentElement);
                }, timeout);
            });
        });
    };

    /** Checks whether or not an element is visible. The default jQuery implementation doesn't work. */
    $.fn.isVisible = function() {
        return !($(this).css('visibility') == 'hidden' || $(this).css('display') == 'none');
    };

    /** Sorts options in a select / list box. */
    $.fn.sortOptions = function(options) {
        return this.each(function() {
            var option = $(this).find('option').remove();
            if (options.sort !== false) {
                option.sort(function(a, b) {
                    var at = $(a).text(), bt = $(b).text();
                    if (options.sort === 'case-insensitive') {
                        at = at.toLowerCase(), bt = bt.toLowerCase();
                    }
                    return (at > bt) ? 1 : ((at < bt) ? -1 : 0);
                });
            }
            $(this).append(option);
        });
    };

    function uiElements() {
        return $(_parentElement).find('select, input, button');
    }

    /** Locks the boxes and buttons until `unlock()` is called */
    $.fn.lock = function() {
        _locked = true;
        uiElements().attr('disabled', _locked);
        return _locked;
    };

    /** Unlocks the boxes and buttons from a preceding call to `lock()` */
    $.fn.unlock = function() {
        _locked = false;
        uiElements().attr('disabled', _locked);
        return _locked;
    };

    function isLocked() {
        return _locked === true;
    }

    $.fn.isLocked = isLocked;

    /** Simple delay function that can wrap around an existing function and provides a callback. */
    var delay = (function() {
        var timer = 0;
        return function (callback, ms) {
            clearTimeout(timer);
            timer = setTimeout(callback, ms);
        };
    })();
})(jQuery);