$(document).ready(function() {
    $('input[placeholder], textarea[placeholder]').placeholder();
    $('select').each(function() {
        $(this).siblings('p').text($(this).children('option:selected').text());
    });
    $('select').change(function() {
        $(this).siblings('p').text($(this).children('option:selected').text());
    });
    //последовательное появление блоков
    $(document).ready(function() {

        $(function() {
            $('.s1-txt').each(function(i) {
                $(this).delay((i++) * 1500).fadeTo(3000, 1);
            })
        });

    });

    //скрол к форме

    $('.button-g').on('click', function() {
        var el = $(this).attr('data-href');
        $('html, body').animate({
            scrollTop: $(el).offset().top
        }, 500);
        return false;
    });
    $('.bxsliderr').bxSlider({
        infiniteLoop: false,
        hideControlOnEnd: true,
        pager: false,
        controls: true
    });



    // Задание счетчика
    $('#defaultCountdown').countdown({ until: '+0d +15h 15m ', format: 'HMS' });
    $('#defaultCountdown1').countdown({ until: '+0d +15h 15m ', format: 'HMS' });


    function inputlen(A, B) {
        // Проверка на введенные данные
        if (A < 2 || $("#" + B).val() == $("#" + B).attr('placeholder')) {
            $("#" + B).addClass("error");
            return false;
        } else {
            $("#" + B).removeClass("error");
            return true;
        }
    }
    // Валидация и отправка формы

});