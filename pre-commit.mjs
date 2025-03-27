import { exec } from 'child_process'

const proc = exec(`bash pre-commit.sh`, {
    encoding: 'utf-8',
})

proc.stdout.on('data', (data) => {
    console.log('\x1b[36m%s\x1b[0m', data) // Using ANSI escape codes for blueish color (docker)
})

proc.stderr.on('data', (data) => {
    console.error('\x1b[31m%s\x1b[0m', data) // Using ANSI escape codes for red color
})

proc.on('close', (code) => {
    if (code !== 0) {
        console.error(
            '\x1b[31m%s\x1b[0m',
            '[BAD] running pre-commit checks. No changes were committed.',
        )
        process.exit(1)
    } else {
        console.log(
            '\x1b[32m%s\x1b[0m',
            '[GOOD] Pre-commit checks passed! Moving forward...',
        )
    }
})
