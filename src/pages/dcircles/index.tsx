import React from 'react';
import { observer } from 'mobx-react-lite';
import './dcircles.scss';

const Dcircles = observer(() => {
    return (
        <div className='dcircles'>
            <div className='dcircles__iframe-container'>
                <iframe
                    src='https://app.deriv.com/dcircles'
                    className='dcircles__iframe'
                    title='Deriv D-Circles'
                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; payment'
                    allowFullScreen
                    sandbox='allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation'
                />
            </div>
        </div>
    );
});

export default Dcircles;
