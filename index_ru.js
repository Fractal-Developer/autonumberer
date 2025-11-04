const fs = require('node:fs');
const path = require('path');
const chalk = require('chalk');
const { log } = require('node:console');
const { get } = require('node:http');

/*  C аргуметом   'D:\Program\Node\AutoRenameFoto\',
    'C:\\Program Files\\nodejs\\node.exe',
    'D:\\Program\\Node\\AutoRenameFoto\\index.js',
    'D:\\Program\\Node\\AutoRenameFoto' 
*/

/*  Без аргумента
    'C:\\Program Files\\nodejs\\node.exe',
    'D:\\Program\\Node\\AutoRenameFoto\\index.js'
*/

/*  exe с аргуметом   'D:\Program\Node\AutoRenameFoto\',
    'D:\\Program\\Node\\AutoRenameFoto\\index.exe',
    'C:\\snapshot\\AutoRenameFoto\\index.js',
    'D:\\Program\\Node\\AutoRenameFoto\\'
*/

/*  exe без аргумента
    'D:\\Program\\Node\\AutoRenameFoto\\index.exe',
    'C:\\snapshot\\AutoRenameFoto\\index.js'
*/

// console.table(process.versions);

/* args.forEach(arg => {

}) */

let options = {};
console.log(chalk.blue('Директория из которой запущен скрипт:', process.cwd()));

// Блок обработки флагов и записи их в объект options
if (process.argv.some(arg => /^.*?-/.test(arg))) {
    process.stdout.write(chalk.yellow('В командной строке обнаружены конфигурационные флаги: '));
    process.argv.forEach((arg, index) => {
        if (arg.startsWith('--')) {
            process.stdout.write(chalk.yellow(arg) +'  ');
            let [key, value] = arg.split('=');
            switch (value) {
                case 'true':
                    value = true;
                    break;
                case 'false':
                    value = false;
                    break;
                case undefined:
                    value = true;
                    break;
                default:
                    break;
            }
            options[key.slice(2)] = value;
            delete process.argv[index];
        }
    });
    console.log();
} else {
    console.log(chalk.blue('В командной строке отсутствуют конфигурационные флаги.'));
}

if (options.help) {
    console.log(chalk.blue(`
При отсутсвии флагов принимается один аргумент - путь для упорядочивания элементов,
при его отсутствии, упорядочивание будет выполнено в каталоге расположения данного исполняемого файла.`));
    console.log(chalk.blue(`При наличии флагов, путь для упорядочивания элементов берётся из флага --path=<путь>,
при его отсутствии, путь берётся из первого аргумента, если это не другой флаг, в иных случаях упорядочивание 
будет выполнено в каталоге расположения данного исполняемого файла.`));
    console.log(chalk.blue(`
--help вывод помощи по конфигурации и использованию программы.
--path=<путь> устанавливает путь для рабоы программы.
--directory включает в список обработки каталоги (по умолчанию --directory=false).
--delete удаляет нумерацию у элементов с корректной датой. 
    `));
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', process.exit(0));
}

// Возвращает первый аргумент (даже если он начинается с --) или если он отсутсвует абсолютный путь запуска текущего скрипта
function getFirstArg() {
    const log1 = (path) => console.log(chalk.yellow('Путь для упорядочивания взят из первого аргумента командной строки: ', path));
    const log2 = (path) => console.log(chalk.yellow('Путь для упорядочивания взят из каталога расположения исполняемого файла: ', path));
    // Получаем аргументы командной строки
    return process.argv[0].endsWith('node.exe') ?
        process.argv[2] ?
            (log1(process.argv[2]), process.argv[2]) : (log2(path.dirname(process.argv[1])), path.dirname(process.argv[1]))
        :
        process.argv[2] ?
            (log1(process.argv[2]), process.argv[2]) : (log2(path.dirname(process.argv[0])), path.dirname(process.argv[0]))
}

// В случае отсутствия флагов с указанием пути, берём путь как первый аргумент или по месту расположения исполняемого файла
(options.path ? console.log(chalk.yellow('Путь для упорядочивания взят из флага --path=<путь>: ', options.path)) : true) && (options.path = getFirstArg());

// Блок чтения элементов из директории (только названия элементов, без путей)
let elements;
try {
    elements = fs.readdirSync(options.path);
    console.log(chalk.green('Элементы директории успешно прочитаны.'));
} catch (error) {
    console.log(chalk.red(`Ошибка при чтении директории: ${options.path}`));
    throw new Error(chalk.red(error.message));
}

// Функция получения элементов с абсолютными путями
function elementsWithDir(elements, pathElements, isDirectory) {
    const files = [];
    const directories = [];
    // Получения элементов с абсолютными путями
    elements.forEach(e => {
        let elementsPath = path.join(pathElements, e);
        fs.statSync(elementsPath).isFile() ? files.push(e) : directories.push(e);
    });
    // Согласно ключам определяем будут ли добавлены каталоги как элементы
    return isDirectory ? files.concat(directories) : files
}

// Получение количества дней в месяце
function getDaysInMonth(month, year) {
    // Проверка на корректность номера месяца
    if (month < 1 || month > 12) {
        throw new Error(chalk.red("Номер месяца должен быть от 1 до 12."));
    }
    // Преобразуем последние две цифры года в полный год
    const fullYear = 2000 + year; // Предполагаем, что год находится в 2000-х
    // Используем метод Date для получения количества дней
    return new Date(fullYear, month, 0).getDate();
}

// Проверка правильности даты на основании её текстового представления
function isCorrectDate(elem) {
    // Проверяем на наличие пробела
    const dateIndex = elem.indexOf(' ');
    if (dateIndex === -1) {
        console.log(chalk.yellow('Элемент исключённый из обработки (не имеет пробела): ', elem));
        return
    }
    // Выделяем текстовую часть даты
    dateString = elem.slice(0, dateIndex).replace(/^.*_/, '');
    // Проверяем длину текстовой даты
    if (dateString.length !== 8) {
        console.log(chalk.yellow('Элемент исключённый из обработки (некорректная длина даты): ', elem));
        return false
    }
    // Получаем числовые значения даты
    const [day, month, year] = dateString.split('.').map(part => parseInt(part, 10));
    // Проверяем чтоб количество дней в месяце не превышало максимально возможное
    if (getDaysInMonth(month, year) < day) {
        console.log(chalk.yellow('Элемент исключённый из обработки (неверный день месяца): ', elem));
        return false
    }
    // Проверяем чтоб дата была не позднее текущей
    if (new Date(year + 2000, month - 1, day) > new Date()) {
        console.log(chalk.yellow('Элемент исключён из обработки (дата позднее текущей): ', elem));
        return false
    }
    return [day, month, year]
}

// Массив объектов типа { file: <Абсолютный путь к элементу>, day, month, year }
const filesObject = [];

// Заполняем объект данными, если все проверки пройдены
elementsWithDir(elements, options.path, options.directory).forEach(elem => {
    if (resultCorrectDate = isCorrectDate(elem)) {
        const [day, month, year] = resultCorrectDate;
        filesObject.push({ file: elem, day, month, year });
    } else return;
});

// Сортируем массив по старению даты
filesObject.sort((fileObject1, fileObject2) => new Date(fileObject2.year + 2000, fileObject2.month - 1, fileObject2.day).getTime() - new Date(fileObject1.year + 2000, fileObject1.month - 1, fileObject1.day).getTime());

// Переименовываем отсортированные элементы
filesObject.forEach((fileObject, index) => {
    const oldFile = path.join(options.path, fileObject.file);
    // Если стоит флаг удаления - убираем нумерацию
    let newFile;
    if (options.delete) {
        newFile = path.join(options.path, `${fileObject.file.replace(/^.*?_/, '')}`)
    } else {
        newFile = path.join(options.path, `${(index + 1)}_${fileObject.file.replace(/^.*?_/, '')}`)
    }
    // Переименование файлов
    try {
        fs.renameSync(oldFile, newFile);
        console.log(chalk.green('Элемент успешно переименован:', oldFile, ' ---> ', newFile));
    } catch (err) {
        console.error(chalk.red('Ошибка при переименовании элемента:', err));
    }
})

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on('data', process.exit);




