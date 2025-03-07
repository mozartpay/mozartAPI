import axios, { AxiosInstance, AxiosError } from 'axios';
import {
    ValidationError,
    QuoteResponse,
    MinimumAmountError,
    SinkCarbonParams,
    SinkCarbonResponse,
    StellarCarbonAPIError
} from './types';

export class StellarCarbonAPI {
    private client: AxiosInstance;
    private isTestnet: boolean;
    private baseURL: string;
    
    constructor(isTestnet: boolean = true) {
        this.isTestnet = isTestnet;
        const testnetURL = process.env.STELLAR_CARBON_TESTNET_URL || 'https://api.stellarcarbon.io/test';
        const mainnetURL = process.env.STELLAR_CARBON_MAINNET_URL || 'https://api.stellarcarbon.io';

        if (!testnetURL || !mainnetURL) {
            throw new Error('Stellar Carbon API URLs not configured in environment variables');
        }

        this.baseURL = this.isTestnet ? testnetURL : mainnetURL;
        console.log(`🌐 Initializing Stellar Carbon API:`, {
            environment: this.isTestnet ? 'testnet' : 'mainnet',
            baseURL: this.baseURL
        });
            
        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        // Add response interceptor for error handling
        this.client.interceptors.response.use(
            response => response,
            (error: AxiosError<ValidationError>) => {
                if (error.response?.status === 422) {
                    const detail = error.response.data.detail[0];
                    if (detail.minimum_amount) {
                        return Promise.reject({
                            error: 'MinimumAmountError',
                            message: detail.msg,
                            minimumAmount: parseFloat(detail.minimum_amount)
                        } as MinimumAmountError);
                    }
                }
                return Promise.reject({
                    error: error.response?.data?.detail?.[0]?.msg || error.message,
                    details: error.response?.data
                } as StellarCarbonAPIError);
            }
        );
    }
    
    async getUSDQuote(usdAmount: number): Promise<QuoteResponse> {
        const response = await this.client.get<QuoteResponse>('/carbon/usd-quote', {
            params: { usd_amount: usdAmount.toFixed(2) }
        });
        return response.data;
    }
    
    async getSinkCarbonXDR(params: SinkCarbonParams): Promise<SinkCarbonResponse> {
        // Funder goes in query params, rest in body
        const queryParams = new URLSearchParams();
        queryParams.append('funder', params.funder);
        
        // Build request body
        const body: {
            carbon_amount: number | undefined;
            usdc_amount: number | undefined;
            payment_asset: string | undefined;
            vcs_project_id: number | undefined;
            recipient?: string;
        } = {
            carbon_amount: params.carbonAmount,
            usdc_amount: params.usdcAmount,
            payment_asset: params.paymentAsset,
            vcs_project_id: params.vcsProjectId
        };
        
        if (params.recipient) {
            body.recipient = params.recipient;
        }
        
        const response = await this.client.post<SinkCarbonResponse>(
            `/carbon/sink-carbon/xdr?${queryParams}`,
            body
        );
        return response.data;
    }

    // Add getter for current network info
    public getNetworkInfo() {
        return {
            isTestnet: this.isTestnet,
            baseURL: this.baseURL,
            network: this.isTestnet ? 'testnet' : 'mainnet'
        };
    }
}

// Export a singleton instance
// TODO: Remove force testnet when ready for mainnet
const isTestnet = true; // Force testnet for now
console.log(`🌍 Creating Stellar Carbon API instance:`, {
    NODE_ENV: process.env.NODE_ENV,
    isTestnet,
    message: '⚠️ Using TESTNET (api.stellarcarbon.io/test) - Forced testnet mode'
});

export const carbonAPI = new StellarCarbonAPI(isTestnet);
