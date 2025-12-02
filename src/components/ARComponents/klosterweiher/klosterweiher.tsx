import React from 'react';
import * as AR from '../../../ARbackend/ARVisualizer';

const KlosterweiherPage: React.FC = () => {
    return (
        <div>
            <h1>Klosterweiher AR Component</h1>
        </div>
    );
};

export default KlosterweiherPage;

let ARObject = new AR.ARVisualizer();
ARObject.startVisualization();