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
    
    constructor(isTestnet: boolean = true) {
        const testnetURL = process.env.STELLAR_CARBON_TESTNET_URL;
        const mainnetURL = process.env.STELLAR_CARBON_MAINNET_URL;

        if (!testnetURL || !mainnetURL) {
            throw new Error('Stellar Carbon API URLs not configured in environment variables');
        }

        const baseURL = isTestnet ? testnetURL : mainnetURL;
            
        this.client = axios.create({
            baseURL,
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
        const queryParams = new URLSearchParams();
        
        // Required parameter
        queryParams.append('funder', params.funder);
        
        // Optional parameters
        if (params.recipient) queryParams.append('recipient', params.recipient);
        if (params.carbonAmount) queryParams.append('carbon_amount', params.carbonAmount.toString());
        if (params.usdcAmount) queryParams.append('usdc_amount', params.usdcAmount.toString());
        if (params.paymentAsset) queryParams.append('payment_asset', params.paymentAsset);
        if (params.vcsProjectId) queryParams.append('vcs_project_id', params.vcsProjectId.toString());
        
        const response = await this.client.get<SinkCarbonResponse>(`/carbon/sink-carbon?${queryParams}`);
        return response.data;
    }
}

// Export a singleton instance for convenience
export const carbonAPI = new StellarCarbonAPI(process.env.NODE_ENV !== 'production');
