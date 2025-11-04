const fs = require('node:fs');
const path = require('path');
const chalk = require('chalk');
const { log } = require('node:console');
const { get } = require('node:http');

let options = {};
console.log(chalk.blue('The directory from which the script is launched:', process.cwd()));

//Block for processing flags and writing them to the options object
if (process.argv.some(arg => /^.*?-/.test(arg))) {
    process.stdout.write(chalk.yellow('Configuration flags found on the command line: '));
    process.argv.forEach((arg, index) => {
        if (arg.startsWith('--')) {
            process.stdout.write(chalk.yellow(arg) +' ');
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
    console.log(chalk.blue('There are no configuration flags on the command line.'));
}

if (options.help) {
    console.log(chalk.blue(`
If there are no flags, one argument is accepted -the path for ordering the elements,
if it is absent, the ordering will be performed in the directory where the given executable file is located.`));
    console.log(chalk.blue(`If flags are present, the path for ordering elements is taken from the --path=<path> flag,
if it is absent, the path is taken from the first argument, unless it is another flag, otherwise the ordering 
will be executed in the directory where this executable file is located.`));
    console.log(chalk.blue(`
--help display help on configuration and use of the program.
--path=<path> sets the path for the program to run.
--directory includes directories in the processing list (default --directory=false).
--delete removes numbering from elements with the correct date. 
    `));
process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', process.exit(0));
}

//Returns the first argument (even if it starts with --) or if it is missing the absolute path to start the current script
function getFirstArg() {
    const log1 = (path) => console.log(chalk.yellow('The path to sort is taken from the first command line argument: ', path));
const log2 = (path) => console.log(chalk.yellow('The path to organize is taken from the directory where the executable file is located: ', path));
    //Get command line arguments
    return process.argv[0].endsWith('node.exe') ?
        process.argv[2] ?
            (log1(process.argv[2]), process.argv[2]) : (log2(path.dirname(process.argv[1])), path.dirname(process.argv[1]))
        :
        process.argv[2] ?
(log1(process.argv[2]), process.argv[2]) : (log2(path.dirname(process.argv[0])), path.dirname(process.argv[0]))
}

//In the absence of flags indicating the path, take the path as the first argument or at the location of the executable file
(options.path ? console.log(chalk.yellow('The path to be ordered is taken from the flag --path=<path>: ', options.path)) : true) && (options.path = getFirstArg());

//Block for reading elements from a directory (only names of elements, no paths)
let elements;
try {
    elements = fs.readdirSync(options.path);
    console.log(chalk.green('Directory items read successfully.'));
} catch (error) {
    console.log(chalk.red(`Error reading directory: ${options.path}`));
    throw new Error(chalk.red(error.message));
}

//Function for getting elements with absolute paths
function elementsWithDir(elements, pathElements, isDirectory) {
    const files = [];
    const directories = [];
//Get elements with absolute paths
    elements.forEach(e => {
        let elementsPath = path.join(pathElements, e);
        fs.statSync(elementsPath).isFile() ? files.push(e) : directories.push(e);
    });
    //According to the keys, we determine whether directories will be added as elements
    return isDirectory ? files.concat(directories) : files
}

//Get the number of days in a month
function getDaysInMonth(month, year) {
    //Check if the month number is correct
if (month < 1 || month > 12) {
        throw new Error(chalk.red("The month number must be from 1 to 12."));
    }
    //Convert the last two digits of the year to a full year
    const fullYear = 2000 + year; //Assume the year is in the 2000s
    //Use the Date method to get the number of days
    return new Date(fullYear, month, 0).getDate();
}

//Checking the validity of the date based on its textual representation
function isCorrectDate(elem) {
//Check for space
    const dateIndex = elem.indexOf(' ');
    if (dateIndex === -1) {
        console.log(chalk.yellow('Element excluded from processing (does not have a space): ', elem));
        return
    }
    //Select the text part of the date
    dateString = elem.slice(0, dateIndex).replace(/^.*_/, '');
    //Check the length of the text date
    if (dateString.length !== 8) {
console.log(chalk.yellow('Element excluded from processing (incorrect date length): ', elem));
        return false
    }
    //Get numeric date values
    const [day, month, year] = dateString.split('.').map(part => parseInt(part, 10));
    //Check that the number of days in a month does not exceed the maximum possible
    if (getDaysInMonth(month, year) < day) {
        console.log(chalk.yellow('Element excluded from processing (invalid day of month): ', elem));
return false
    }
    //Check that the date is no later than the current one
    if (new Date(year + 2000, month -1, day) > new Date()) {
        console.log(chalk.yellow('Element excluded from processing (date later than current): ', elem));
        return false
    }
    return [day, month, year]
}

//Array of objects of type { file: <Absolute path to the element>, day, month, year }
const filesObject = [];

//Fill the object with data if all checks are passed
elementsWithDir(elements, options.path, options.directory).forEach(elem => {
    if (resultCorrectDate = isCorrectDate(elem)) {
        const [day, month, year] = resultCorrectDate;
        filesObject.push({ file: elem, day, month, year });
    } else return;
});

//Sort the array by date aging
filesObject.sort((fileObject1, fileObject2) => new Date(fileObject2.year + 2000, fileObject2.month -1, fileObject2.day).getTime() -new Date(fileObject1.year + 2000, fileObject1.month -1, fileObject1.day).getTime());

//Rename sorted elements
filesObject.forEach((fileObject, index) => {
    const oldFile = path.join(options.path, fileObject.file);
    //If the deletion flag is set, remove the numbering
    let newFile;
    if (options.delete) {
newFile = path.join(options.path, `${fileObject.file.replace(/^.*?_/, '')}`)
    } else {
        newFile = path.join(options.path, `${(index + 1)}_${fileObject.file.replace(/^.*?_/, '')}`)
    }
    //Rename files
    try {
        fs.renameSync(oldFile, newFile);
        console.log(chalk.green('Element successfully renamed:', oldFile, ' ---> ', newFile));
    } catch (err) {
        console.error(chalk.red('Error renaming element:', err));
    }
})
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on('data', process.exit);