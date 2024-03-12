type Config = {
	host: string;
	serverName?: string;
	i: string;
	master?: string;
	wsUrl: string;
	apiUrl: string;
	keywordEnabled: boolean;
	reversiEnabled: boolean;
	notingEnabled: boolean;
	chartEnabled: boolean;
	serverMonitoring: boolean;
	checkEmojisEnabled?: boolean;
	checkEmojisAtOnce?: boolean;
	mecab?: string;
	mecabDic?: string;
	memoryDir?: string;
};

import config from '../config.json' assert { type: 'json' };

// @ts-ignore
config.wsUrl = config.host.replace('http', 'ws');
// @ts-ignore
config.apiUrl = config.host + '/api';

// @ts-ignore
export default config as Config;
