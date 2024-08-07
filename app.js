const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const app = express();

// 정적 파일 제공을 위해 public 폴더 설정
app.use(express.static(path.join(__dirname, 'public')));

// 크롤링 함수
const visitedUrls = new Set(); // 이미 방문한 URL을 추적하기 위한 Set
const queue = []; // 크롤링할 URL을 저장하는 큐

async function savePage(url, filePath) {
    try {
        const response = await axios.get(url);
        if (response.status === 200) {
            const html = response.data;
            const $ = cheerio.load(html);
            const textContent = $('body').text();
            fs.writeFileSync(filePath, textContent);
            console.log(`페이지를 성공적으로 저장했습니다: ${filePath}`);
        } else {
            console.log(`요청이 실패했습니다. 응답 코드: ${response.status}`);
        }
    } catch (error) {
        console.error(`오류 발생: ${error}`);
    }
}

async function depthCRAWL(startUrls, outputFolder) {
    try {
        if (!fs.existsSync(outputFolder)) {
            fs.mkdirSync(outputFolder);
        }

        startUrls.forEach(url => {
            queue.push(url);
        });

        while (queue.length > 0) {
            const currentUrl = queue.shift();
            if (visitedUrls.has(currentUrl)) {
                console.log(`이미 방문한 URL입니다: ${currentUrl}`);
                continue;
            }

            visitedUrls.add(currentUrl);
            const response = await axios.get(currentUrl);
            if (response.status !== 200) {
                console.log(`요청이 실패했습니다. 응답 코드: ${response.status}`);
                continue;
            }
            const html = response.data;
            const $ = cheerio.load(html);
            const links = $('a');

            links.each(async (_, element) => {
                let link = $(element).attr('href');
                if (link && !link.startsWith('http')) {
                    link = new URL(link, currentUrl).href;
                }
                if (link && !visitedUrls.has(link)) {
                    await savePage(link, `${outputFolder}/page_${visitedUrls.size}.txt`);
                    queue.push(link);
                }
            });
        }
    } catch (error) {
        console.error(`오류 발생: ${error}`);
    }
}

// 루트 라우트 - 웹 UI
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 검색 라우트
app.get('/search', async (req, res) => {
    try {
        const searchTerm = req.query.searchTerm;
        const searchResults = await crawlAndSearch(searchTerm);
        res.json({ results: searchResults });
    } catch (error) {
        console.error(`검색 중 오류 발생: ${error}`);
        res.status(500).json({ error: '검색 중 오류 발생' });
    }
});

// 크롤링 및 검색 함수
async function crawlAndSearch(searchTerm) {
    const outputFolder = "pages";
    const files = fs.readdirSync(outputFolder);
    const matchingFiles = files.filter(file => {
        const content = fs.readFileSync(`${outputFolder}/${file}`, 'utf8');
        return content.toLowerCase().includes(searchTerm.toLowerCase());
    });
    return matchingFiles;
}

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});

// 크롤링할 웹사이트 URL 목록과 출력 폴더 지정
const startUrls = [
    "https://www.naver.com",
    "https://www.google.com",
    "https://www.bing.com",
    "https://github.com",
    "https://www.microsoft.com",
    "https://www.apple.com",
    "https://www.amazon.com",
    "https://www.netflix.com",
    "https://www.youtube.com",
    "https://www.twitter.com",
    "https://www.whatsapp.com",
    "https://www.dcinside.com",
    "https://www.lge.co.kr",
    "https://www.samsung.com",
    "https://store.steampowered.com/"
];
const outputFolder = "pages";

// 웹사이트 크롤링 시작
depthCRAWL(startUrls, outputFolder);
